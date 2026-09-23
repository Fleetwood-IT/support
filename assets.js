// =====================================================
// FLEETWOOD IT SUPPORT CENTER
// IT ASSET MANAGEMENT
// VERSION 1.2
// =====================================================


// =====================================================
// SUPABASE
// =====================================================

const SUPABASE_URL =
    "https://xcfobyusisjbfbnsohjz.supabase.co";

const SUPABASE_ANON_KEY =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhjZm9ieXVzaXNqYmZibnNvaGp6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg3ODc5NzEsImV4cCI6MjEwNDM2Mzk3MX0.ATSzb3RKqGDNPEL_YdORwBzsQJPMIqONzJJaG7LW9YU";

const supabaseClient =
    window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_ANON_KEY
    );


// =====================================================
// GLOBAL VARIABLES
// =====================================================

let currentUser = null;
let currentProfile = null;

let allAssets = [];

let editingAssetId = null;

let isSaving = false;

let searchDebounceTimer = null;


// =====================================================
// INITIALIZE
// =====================================================

document.addEventListener(
    "DOMContentLoaded",
    async () => {

        setupAssetForm();
        setupAssetFilters();
        setupAssetTableActions();

        const allowed =
            await checkAssetSession();

        if (!allowed) {
            return;
        }

        await loadAssets();

    }
);


// =====================================================
// SESSION CHECK
//
// NOTE: This only controls what the UI shows/hides.
// It is NOT a security boundary. The anon key used above
// can call the Supabase REST API directly from devtools,
// bypassing all of this. Real enforcement must live in
// Postgres Row Level Security policies on the "assets"
// and "user_profiles" tables (write policies restricted
// to role = 'it', etc). See the accompanying RLS SQL.
// =====================================================

async function checkAssetSession() {

    try {

        const {
            data: {
                session
            },
            error
        } =
            await supabaseClient.auth.getSession();


        if (error || !session) {

            window.location.href =
                "index.html";

            return false;

        }


        currentUser =
            session.user;


        const {
            data: profile,
            error: profileError
        } =
            await supabaseClient
                .from("user_profiles")
                .select(
                    "id, full_name, role"
                )
                .eq(
                    "id",
                    currentUser.id
                )
                .single();


        if (
            profileError ||
            !profile
        ) {

            window.location.href =
                "index.html";

            return false;

        }


        currentProfile =
            profile;


        const role =
            String(
                profile.role || ""
            ).toLowerCase();


        // -------------------------------------------------
        // IT + MANAGER + ADMIN CAN VIEW ASSETS
        // -------------------------------------------------

        if (
            role !== "it" &&
            role !== "manager" &&
            role !== "admin"
        ) {

            window.location.href =
                "index.html";

            return false;

        }


        // Save information (UI convenience only — never
        // trust this for permission checks)
        localStorage.setItem(
            "fleetwoodRole",
            role
        );

        localStorage.setItem(
            "fleetwoodUserName",
            profile.full_name ||
            "User"
        );


        updateUserInformation(
            profile
        );


        // -------------------------------------------------
        // IT CAN EDIT
        // MANAGER/ADMIN VIEW ONLY
        // -------------------------------------------------

        if (
            role === "manager" ||
            role === "admin"
        ) {

            disableAssetEditing();

        }


        return true;

    } catch (error) {

        console.error(
            "Asset session error:",
            error
        );

        window.location.href =
            "index.html";

        return false;

    }

}


// =====================================================
// UPDATE USER INFORMATION
// =====================================================

function updateUserInformation(
    profile
) {

    const name =
        profile.full_name ||
        "User";


    const nameElement =
        document.getElementById(
            "assetUserName"
        );


    const roleElement =
        document.getElementById(
            "assetUserRole"
        );


    const avatarElement =
        document.getElementById(
            "assetUserAvatar"
        );


    if (nameElement) {

        nameElement.textContent =
            name;

    }


    if (roleElement) {

        roleElement.textContent =
            formatRole(
                profile.role
            );

    }


    if (avatarElement) {

        avatarElement.textContent =
            getInitials(name);

    }

}


// =====================================================
// FORMAT ROLE
// =====================================================

function formatRole(role) {

    const value =
        String(role || "")
            .toLowerCase();


    if (value === "it") {
        return "IT Support";
    }


    if (value === "manager") {
        return "Manager";
    }


    if (value === "admin") {
        return "Administrator";
    }


    return "Staff";

}


// =====================================================
// INITIALS
// =====================================================

function getInitials(name) {

    const parts =
        String(name || "")
            .trim()
            .split(/\s+/)
            .filter(Boolean);


    if (!parts.length) {
        return "IT";
    }


    if (parts.length === 1) {

        return parts[0]
            .substring(0, 2)
            .toUpperCase();

    }


    return (
        parts[0][0] +
        parts[parts.length - 1][0]
    ).toUpperCase();

}


// =====================================================
// LOAD ASSETS
// =====================================================

async function loadAssets() {

    try {

        const {
            data,
            error
        } =
            await supabaseClient
                .from("assets")
                .select("*")
                .order(
                    "created_at",
                    {
                        ascending: false
                    }
                );


        if (error) {
            throw error;
        }


        allAssets =
            data || [];


        renderAssets(
            allAssets
        );


        updateAssetStatistics(
            allAssets
        );


        renderDepartmentSummary(
            allAssets
        );


    } catch (error) {

        console.error(
            "Unable to load assets:",
            error
        );


        const body =
            document.getElementById(
                "assetsTableBody"
            );


        if (body) {

            body.innerHTML = `
                <tr>
                    <td colspan="9">
                        Unable to load assets.
                        Please check your database.
                    </td>
                </tr>
            `;

        }

    }

}


// =====================================================
// FIELD HELPERS
//
// The "assets" table has historically used a couple of
// different column names for the same concept (a leftover
// from an earlier schema). These helpers centralize the
// fallback logic in one place instead of repeating
// `a || b` everywhere. Writes always use the canonical
// name (asset_type, asset_name, condition).
// =====================================================

function getAssetType(asset) {

    return (
        asset.asset_type ||
        asset.type ||
        "Other"
    );

}


function getAssetName(asset) {

    return (
        asset.asset_name ||
        asset.name ||
        "-"
    );

}


function getAssetCondition(asset) {

    return (
        asset.condition ||
        asset.asset_condition ||
        "Good"
    );

}


// =====================================================
// RENDER ASSETS
// =====================================================

function renderAssets(
    assets
) {

    const body =
        document.getElementById(
            "assetsTableBody"
        );


    if (!body) {
        return;
    }


    if (!assets.length) {

        body.innerHTML = `
            <tr>
                <td colspan="9">
                    No assets have been registered yet.
                </td>
            </tr>
        `;

        return;

    }


    const role =
        String(
            currentProfile?.role || ""
        ).toLowerCase();


    const canEdit =
        role === "it";


    body.innerHTML =
        assets.map(
            asset => {

                const condition =
                    getAssetCondition(asset);


                const status =
                    asset.status ||
                    "Available";


                return `
                    <tr data-row-id="${escapeHTML(String(asset.id))}">

                        <td>
                            <strong>
                                ${escapeHTML(
                                    asset.asset_tag ||
                                    formatAssetId(
                                        asset.id
                                    )
                                )}
                            </strong>
                        </td>


                        <td>
                            ${escapeHTML(
                                getAssetType(asset)
                            )}
                        </td>


                        <td>
                            ${escapeHTML(
                                getAssetName(asset)
                            )}
                        </td>


                        <td>
                            ${escapeHTML(
                                asset.serial_number ||
                                "-"
                            )}
                        </td>


                        <td>
                            ${escapeHTML(
                                asset.department ||
                                "-"
                            )}
                        </td>


                        <td>
                            ${escapeHTML(
                                asset.assigned_to ||
                                "Not Assigned"
                            )}
                        </td>


                        <td>
                            <span class="status-badge ${
                                conditionClass(
                                    condition
                                )
                            }">
                                ${escapeHTML(
                                    condition
                                )}
                            </span>
                        </td>


                        <td>
                            <span class="status-badge ${
                                assetStatusClass(
                                    status
                                )
                            }">
                                ${escapeHTML(
                                    status
                                )}
                            </span>
                        </td>


                        <td>

                            ${
                                canEdit
                                    ? `
                                        <button
                                            type="button"
                                            class="btn btn-small"
                                            data-action="edit">
                                            Edit
                                        </button>

                                        <button
                                            type="button"
                                            class="btn btn-small btn-danger"
                                            data-action="delete">
                                            Delete
                                        </button>
                                      `
                                    : `
                                        <button
                                            type="button"
                                            class="btn btn-small"
                                            data-action="view">
                                            View
                                        </button>
                                      `
                            }

                        </td>

                    </tr>
                `;

            }
        ).join("");

}


// =====================================================
// TABLE ACTIONS (event delegation)
//
// Buttons no longer carry inline onclick="...('id')"
// handlers. Embedding a value inside a hand-built
// onclick string is fragile — the browser HTML-decodes
// the attribute before it runs as JS, so HTML-escaping
// alone does not make it safe against a stray quote in
// the value. Using data-* attributes + one delegated
// listener avoids the problem entirely and is also less
// code.
// =====================================================

function setupAssetTableActions() {

    const body =
        document.getElementById(
            "assetsTableBody"
        );


    if (!body) {
        return;
    }


    body.addEventListener(
        "click",
        event => {

            const button =
                event.target.closest(
                    "[data-action]"
                );


            if (!button) {
                return;
            }


            const row =
                button.closest(
                    "[data-row-id]"
                );


            if (!row) {
                return;
            }


            const id =
                row.dataset.rowId;


            const action =
                button.dataset.action;


            if (action === "edit") {
                editAsset(id);
            } else if (action === "delete") {
                deleteAsset(id);
            } else if (action === "view") {
                viewAsset(id);
            }

        }
    );


    const departmentBody =
        document.getElementById(
            "departmentAssetsBody"
        );

    void departmentBody;

}


// =====================================================
// ASSET ID
// =====================================================

function formatAssetId(id) {

    if (!id) {
        return "ASSET";
    }


    const value =
        String(id);


    if (
        /^\d+$/.test(value)
    ) {

        return (
            "AST-" +
            value.padStart(
                4,
                "0"
            )
        );

    }


    return (
        "AST-" +
        value
            .substring(0, 8)
            .toUpperCase()
    );

}


// =====================================================
// CONDITION CLASS
// =====================================================

function conditionClass(
    condition
) {

    const value =
        String(condition || "")
            .toLowerCase();


    if (
        value === "faulty"
    ) {

        return "rejected";

    }


    return "resolved";

}


// =====================================================
// ASSET STATUS CLASS
// =====================================================

function assetStatusClass(
    status
) {

    const value =
        String(status || "")
            .toLowerCase();


    if (
        value === "in use"
    ) {

        return "progress";

    }


    if (
        value === "under maintenance"
    ) {

        return "pending";

    }


    return "open";

}


// =====================================================
// UPDATE STATISTICS
// =====================================================

function updateAssetStatistics(
    assets
) {

    const total =
        assets.length;


    const good =
        assets.filter(
            asset =>
                getAssetCondition(asset).toLowerCase()
                === "good"
        ).length;


    const faulty =
        assets.filter(
            asset =>
                getAssetCondition(asset).toLowerCase()
                === "faulty"
        ).length;


    const used =
        assets.filter(
            asset =>
                String(
                    asset.status ||
                    ""
                ).toLowerCase()
                === "in use"
        ).length;


    setText(
        "totalAssets",
        total
    );


    setText(
        "goodAssets",
        good
    );


    setText(
        "faultyAssets",
        faulty
    );


    setText(
        "usedAssets",
        used
    );

}


// =====================================================
// SET TEXT
// =====================================================

function setText(
    id,
    value
) {

    const element =
        document.getElementById(id);


    if (element) {

        element.textContent =
            value;

    }

}


// =====================================================
// DEPARTMENT SUMMARY
// =====================================================

function renderDepartmentSummary(
    assets
) {

    const body =
        document.getElementById(
            "departmentAssetsBody"
        );


    if (!body) {
        return;
    }


    const departments = {};


    assets.forEach(
        asset => {

            const department =
                asset.department ||
                "Unassigned";


            if (!departments[department]) {

                departments[department] = {

                    total: 0,
                    good: 0,
                    faulty: 0,
                    inUse: 0,
                    available: 0

                };

            }


            departments[department].total++;


            const condition =
                getAssetCondition(asset).toLowerCase();


            const status =
                String(
                    asset.status ||
                    ""
                ).toLowerCase();


            if (
                condition === "good"
            ) {

                departments[
                    department
                ].good++;

            }


            if (
                condition === "faulty"
            ) {

                departments[
                    department
                ].faulty++;

            }


            if (
                status === "in use"
            ) {

                departments[
                    department
                ].inUse++;

            }


            if (
                status === "available"
            ) {

                departments[
                    department
                ].available++;

            }

        }
    );


    const names =
        Object.keys(
            departments
        ).sort();


    if (!names.length) {

        body.innerHTML = `
            <tr>
                <td colspan="6">
                    No department information available.
                </td>
            </tr>
        `;

        return;

    }


    body.innerHTML =
        names.map(
            department => {

                const item =
                    departments[department];


                return `
                    <tr>

                        <td>
                            <strong>
                                ${escapeHTML(
                                    department
                                )}
                            </strong>
                        </td>

                        <td>
                            ${item.total}
                        </td>

                        <td>
                            ${item.good}
                        </td>

                        <td>
                            ${item.faulty}
                        </td>

                        <td>
                            ${item.inUse}
                        </td>

                        <td>
                            ${item.available}
                        </td>

                    </tr>
                `;

            }
        ).join("");

}


// =====================================================
// FILTERS
//
// The search box is debounced so typing quickly doesn't
// re-filter/re-render on every keystroke. The <select>
// filters only need "change" — listening for both
// "input" and "change" on a <select> can fire the handler
// twice for a single selection in some browsers.
// =====================================================

function setupAssetFilters() {

    const search =
        document.getElementById(
            "assetSearch"
        );


    const type =
        document.getElementById(
            "assetTypeFilter"
        );


    const condition =
        document.getElementById(
            "assetConditionFilter"
        );


    const status =
        document.getElementById(
            "assetStatusFilter"
        );


    if (search) {

        search.addEventListener(
            "input",
            () => {

                clearTimeout(
                    searchDebounceTimer
                );

                searchDebounceTimer =
                    setTimeout(
                        filterAssets,
                        200
                    );

            }
        );

    }


    [
        type,
        condition,
        status
    ].forEach(
        element => {

            if (element) {

                element.addEventListener(
                    "change",
                    filterAssets
                );

            }

        }
    );

}


// =====================================================
// FILTER ASSETS
// =====================================================

function filterAssets() {

    const search =
        (
            document.getElementById(
                "assetSearch"
            )?.value || ""
        )
        .toLowerCase()
        .trim();


    const type =
        document.getElementById(
            "assetTypeFilter"
        )?.value || "";


    const condition =
        document.getElementById(
            "assetConditionFilter"
        )?.value || "";


    const status =
        document.getElementById(
            "assetStatusFilter"
        )?.value || "";


    const filtered =
        allAssets.filter(
            asset => {

                const searchable = [

                    asset.asset_tag,

                    getAssetName(asset),

                    getAssetType(asset),

                    asset.serial_number,

                    asset.department,

                    asset.assigned_to

                ]
                    .filter(Boolean)
                    .join(" ")
                    .toLowerCase();


                const matchesSearch =
                    !search ||
                    searchable.includes(
                        search
                    );


                const matchesType =
                    !type ||
                    getAssetType(asset) === type;


                const matchesCondition =
                    !condition ||
                    getAssetCondition(asset) === condition;


                const matchesStatus =
                    !status ||
                    (asset.status || "") === status;


                return (
                    matchesSearch &&
                    matchesType &&
                    matchesCondition &&
                    matchesStatus
                );

            }
        );


    renderAssets(
        filtered
    );

}


// =====================================================
// ASSET FORM
// =====================================================

function setupAssetForm() {

    const form =
        document.getElementById(
            "assetForm"
        );


    if (!form) {
        return;
    }


    form.addEventListener(
        "submit",
        saveAsset
    );

}


// =====================================================
// OPEN ASSET FORM
// =====================================================

function openAssetForm() {

    if (
        String(
            currentProfile?.role ||
            ""
        ).toLowerCase() !== "it"
    ) {

        showAssetNotification(
            "Only IT Support can add or edit assets.",
            "error"
        );

        return;

    }


    editingAssetId =
        null;


    document.getElementById(
        "assetModalTitle"
    ).textContent =
        "Add IT Asset";


    document.getElementById(
        "assetForm"
    ).reset();


    document.getElementById(
        "assetId"
    ).value =
        "";


    // Show the quick-add accessory options
    // (only relevant when creating a new asset)

    const accessoryRow =
        document.getElementById(
            "accessoryQuickAdd"
        );

    if (accessoryRow) {

        accessoryRow.style.display =
            "flex";

    }


    const modal =
        document.getElementById(
            "assetModal"
        );


    if (modal) {

        modal.classList.add(
            "show"
        );

        modal.style.display =
            "flex";

    }

}


// =====================================================
// CLOSE FORM
// =====================================================

function closeAssetForm() {

    const modal =
        document.getElementById(
            "assetModal"
        );


    if (!modal) {
        return;
    }


    modal.classList.remove(
        "show"
    );


    setTimeout(
        () => {

            modal.style.display =
                "none";

        },
        200
    );

}


// =====================================================
// SAVE ASSET
//
// NOTE: the `role !== "it"` check below is a UX guard,
// not a security guard. Anyone editing localStorage or
// calling the Supabase client directly from the console
// can skip this file entirely. The real guard has to be
// a Postgres RLS policy on the "assets" table.
// =====================================================

async function saveAsset(
    event
) {

    event.preventDefault();


    if (isSaving) {
        return;
    }


    const role =
        String(
            currentProfile?.role ||
            ""
        ).toLowerCase();


    if (role !== "it") {

        showAssetNotification(
            "You do not have permission to modify assets.",
            "error"
        );

        return;

    }


    isSaving =
        true;


    const button =
        document.getElementById(
            "assetSubmitButton"
        );


    try {

        const assetData = {

            asset_type:
                document.getElementById(
                    "assetType"
                ).value.trim(),

            asset_name:
                document.getElementById(
                    "assetName"
                ).value.trim(),

            serial_number:
                document.getElementById(
                    "serialNumber"
                ).value.trim() || null,

            asset_tag:
                document.getElementById(
                    "assetTag"
                ).value.trim() || null,

            department:
                document.getElementById(
                    "assetDepartment"
                ).value.trim(),

            assigned_to:
                document.getElementById(
                    "assignedTo"
                ).value.trim() || null,

            condition:
                document.getElementById(
                    "assetCondition"
                ).value,

            status:
                document.getElementById(
                    "assetStatus"
                ).value,

            notes:
                document.getElementById(
                    "assetNotes"
                ).value.trim() || null

        };


        if (
            !assetData.asset_type ||
            !assetData.asset_name ||
            !assetData.department
        ) {

            showAssetNotification(
                "Please complete all required fields.",
                "error"
            );

            return;

        }


        if (button) {

            button.disabled =
                true;

            button.textContent =
                editingAssetId
                    ? "Updating..."
                    : "Saving...";

        }


        let result;


        // -------------------------------------------------
        // UPDATE
        // -------------------------------------------------

        if (editingAssetId) {

            result =
                await supabaseClient
                    .from("assets")
                    .update(
                        assetData
                    )
                    .eq(
                        "id",
                        editingAssetId
                    );

        }

        // -------------------------------------------------
        // INSERT
        // -------------------------------------------------

        else {

            result =
                await supabaseClient
                    .from("assets")
                    .insert([
                        assetData
                    ]);


            // -------------------------------------------------
            // QUICK-ADD ACCESSORIES
            // (mouse / charger, same staff + department)
            // -------------------------------------------------

            if (!result.error) {

                await createQuickAccessories(
                    assetData
                );

            }

        }


        if (result.error) {

            throw result.error;

        }


        closeAssetForm();


        showAssetNotification(
            editingAssetId
                ? "Asset updated successfully."
                : "Asset added successfully.",
            "success"
        );


        await loadAssets();


    } catch (error) {

        console.error(
            "Save asset error:",
            error
        );


        showAssetNotification(
            error.message ||
            "Unable to save asset.",
            "error"
        );


    } finally {

        isSaving =
            false;


        if (button) {

            button.disabled =
                false;

            button.textContent =
                "Save Asset";

        }

    }

}


// =====================================================
// CREATE QUICK ACCESSORIES (MOUSE / CHARGER)
// =====================================================

async function createQuickAccessories(
    mainAssetData
) {

    const wantsMouse =
        document.getElementById(
            "assignMouse"
        )?.checked;


    const wantsCharger =
        document.getElementById(
            "assignCharger"
        )?.checked;


    const extras = [];


    if (wantsMouse) {

        extras.push({

            asset_type: "Mouse",

            asset_name: "Mouse",

            serial_number: null,

            asset_tag: null,

            department:
                mainAssetData.department,

            assigned_to:
                mainAssetData.assigned_to,

            condition: "Good",

            status:
                mainAssetData.status ||
                "In Use",

            notes:
                "Added automatically with " +
                (mainAssetData.asset_name || "main asset")

        });

    }


    if (wantsCharger) {

        extras.push({

            asset_type: "Charger",

            asset_name: "Charger",

            serial_number: null,

            asset_tag: null,

            department:
                mainAssetData.department,

            assigned_to:
                mainAssetData.assigned_to,

            condition: "Good",

            status:
                mainAssetData.status ||
                "In Use",

            notes:
                "Added automatically with " +
                (mainAssetData.asset_name || "main asset")

        });

    }


    if (!extras.length) {
        return;
    }


    const {
        error
    } =
        await supabaseClient
            .from("assets")
            .insert(extras);


    if (error) {

        console.error(
            "Quick accessory error:",
            error
        );

        showAssetNotification(
            "Main asset saved, but the mouse/charger could not be added: " +
            error.message,
            "error"
        );

    }

}


// =====================================================
// EDIT ASSET
// =====================================================

function editAsset(
    id
) {

    const role =
        String(
            currentProfile?.role ||
            ""
        ).toLowerCase();


    if (role !== "it") {

        showAssetNotification(
            "Only IT Support can edit assets.",
            "error"
        );

        return;

    }


    const asset =
        allAssets.find(
            item =>
                String(item.id) ===
                String(id)
        );


    if (!asset) {

        showAssetNotification(
            "Asset could not be found.",
            "error"
        );

        return;

    }


    editingAssetId =
        asset.id;


    document.getElementById(
        "assetModalTitle"
    ).textContent =
        "Edit IT Asset";


    document.getElementById(
        "assetId"
    ).value =
        asset.id;


    document.getElementById(
        "assetType"
    ).value =
        getAssetType(asset);


    document.getElementById(
        "assetName"
    ).value =
        getAssetName(asset) === "-" ? "" : getAssetName(asset);


    document.getElementById(
        "serialNumber"
    ).value =
        asset.serial_number ||
        "";


    document.getElementById(
        "assetTag"
    ).value =
        asset.asset_tag ||
        "";


    document.getElementById(
        "assetDepartment"
    ).value =
        asset.department ||
        "";


    document.getElementById(
        "assignedTo"
    ).value =
        asset.assigned_to ||
        "";


    document.getElementById(
        "assetCondition"
    ).value =
        getAssetCondition(asset);


    document.getElementById(
        "assetStatus"
    ).value =
        asset.status ||
        "Available";


    document.getElementById(
        "assetNotes"
    ).value =
        asset.notes ||
        "";


    // Hide the quick-add accessory options while editing
    // (they only apply when creating a brand new asset)

    const accessoryRow =
        document.getElementById(
            "accessoryQuickAdd"
        );

    if (accessoryRow) {

        accessoryRow.style.display =
            "none";

        document.getElementById(
            "assignMouse"
        ).checked = false;

        document.getElementById(
            "assignCharger"
        ).checked = false;

    }


    const modal =
        document.getElementById(
            "assetModal"
        );


    modal.classList.add(
        "show"
    );


    modal.style.display =
        "flex";

}


// =====================================================
// VIEW ASSET
//
// Replaces the old blocking alert() with a small,
// dismissible read-only panel built from the same markup
// patterns as the notification banner, so it doesn't
// freeze the rest of the page or read awkwardly with
// screen readers.
// =====================================================

function viewAsset(
    id
) {

    const asset =
        allAssets.find(
            item =>
                String(item.id) ===
                String(id)
        );


    if (!asset) {
        return;
    }


    const existing =
        document.querySelector(
            ".asset-view-overlay"
        );

    if (existing) {
        existing.remove();
    }


    const rows = [
        ["Asset", getAssetName(asset)],
        ["Type", getAssetType(asset)],
        ["Serial Number", asset.serial_number || "-"],
        ["Department", asset.department || "-"],
        ["Assigned To", asset.assigned_to || "Not Assigned"],
        ["Condition", getAssetCondition(asset)],
        ["Status", asset.status || "-"]
    ];


    const overlay =
        document.createElement("div");

    overlay.className =
        "modal asset-view-overlay show";

    overlay.style.display =
        "flex";

    overlay.innerHTML = `
        <div class="modal-content">

            <div class="modal-header">

                <div>
                    <h2>Asset Details</h2>
                </div>

                <button
                    type="button"
                    class="modal-close"
                    data-close-view>
                    ×
                </button>

            </div>

            <div class="asset-view-body">

                ${
                    rows.map(
                        ([label, value]) => `
                            <div class="asset-view-row">
                                <span>${escapeHTML(label)}</span>
                                <strong>${escapeHTML(value)}</strong>
                            </div>
                        `
                    ).join("")
                }

            </div>

            <div class="modal-actions">

                <button
                    type="button"
                    class="btn btn-secondary"
                    data-close-view>
                    Close
                </button>

            </div>

        </div>
    `;


    document.body.appendChild(overlay);


    overlay.querySelectorAll(
        "[data-close-view]"
    ).forEach(
        button => {

            button.addEventListener(
                "click",
                () => overlay.remove()
            );

        }
    );


    overlay.addEventListener(
        "click",
        event => {

            if (event.target === overlay) {
                overlay.remove();
            }

        }
    );

}


// =====================================================
// DELETE ASSET
// =====================================================

async function deleteAsset(
    id
) {

    const role =
        String(
            currentProfile?.role ||
            ""
        ).toLowerCase();


    if (role !== "it") {

        showAssetNotification(
            "Only IT Support can delete assets.",
            "error"
        );

        return;

    }


    const asset =
        allAssets.find(
            item =>
                String(item.id) ===
                String(id)
        );


    if (!asset) {
        return;
    }


    const confirmed =
        confirm(
            "Are you sure you want to delete this asset?\n\n" +
            getAssetName(asset)
        );


    if (!confirmed) {
        return;
    }


    try {

        const {
            error
        } =
            await supabaseClient
                .from("assets")
                .delete()
                .eq(
                    "id",
                    id
                );


        if (error) {
            throw error;
        }


        showAssetNotification(
            "Asset deleted successfully.",
            "success"
        );


        await loadAssets();


    } catch (error) {

        console.error(
            "Delete asset error:",
            error
        );


        showAssetNotification(
            error.message ||
            "Unable to delete asset.",
            "error"
        );

    }

}


// =====================================================
// MANAGER / ADMIN VIEW-ONLY MODE
// =====================================================

function disableAssetEditing() {

    const newAssetLinks =
        document.querySelectorAll(
            '[onclick*="openAssetForm"]'
        );


    newAssetLinks.forEach(
        link => {

            link.style.display =
                "none";

        }
    );

}


// =====================================================
// LOGOUT
// =====================================================

async function logoutAssets() {

    await supabaseClient.auth.signOut();


    localStorage.removeItem(
        "fleetwoodRole"
    );

    localStorage.removeItem(
        "fleetwoodUserName"
    );

    localStorage.removeItem(
        "fleetwoodUserEmail"
    );

    localStorage.removeItem(
        "fleetwoodUserId"
    );


    window.location.href =
        "index.html";

}


// =====================================================
// NOTIFICATION
// =====================================================

function showAssetNotification(
    message,
    type = "success"
) {

    const old =
        document.querySelector(
            ".fleet-notification"
        );


    if (old) {
        old.remove();
    }


    const notification =
        document.createElement(
            "div"
        );


    notification.className =
        `fleet-notification ${type}`;


    notification.innerHTML = `

        <div class="notification-icon">
            ${
                type === "success"
                    ? "✓"
                    : "!"
            }
        </div>

        <div class="notification-message">
            ${escapeHTML(message)}
        </div>

        <button
            type="button"
            class="notification-close">

            ×

        </button>

    `;


    document.body.appendChild(
        notification
    );


    const close =
        notification.querySelector(
            ".notification-close"
        );


    if (close) {

        close.onclick =
            () => notification.remove();

    }


    requestAnimationFrame(
        () => {

            notification.classList.add(
                "show"
            );

        }
    );


    setTimeout(
        () => {

            notification.remove();

        },
        5000
    );

}


// =====================================================
// ESCAPE HTML
// =====================================================

function escapeHTML(
    value
) {

    if (
        value === null ||
        value === undefined
    ) {

        return "";

    }


    return String(value)
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
        );

}


// =====================================================
// MODAL CLICK OUTSIDE
// =====================================================

document.addEventListener(
    "click",
    event => {

        const modal =
            document.getElementById(
                "assetModal"
            );


        if (
            modal &&
            event.target === modal
        ) {

            closeAssetForm();

        }

    }
);


// =====================================================
// ESCAPE KEY
// =====================================================

document.addEventListener(
    "keydown",
    event => {

        if (
            event.key === "Escape"
        ) {

            closeAssetForm();


            const viewOverlay =
                document.querySelector(
                    ".asset-view-overlay"
                );

            if (viewOverlay) {
                viewOverlay.remove();
            }

        }

    }
);


// =====================================================
// GLOBAL FUNCTIONS
//
// openAssetForm and logoutAssets are still called from
// inline onclick="" attributes in assets.html (sidebar /
// topbar buttons), so they stay on window. Table-row
// actions (edit/view/delete) no longer need to be global
// since they're wired up via event delegation above.
// =====================================================

window.openAssetForm =
    openAssetForm;

window.closeAssetForm =
    closeAssetForm;

window.logoutAssets =
    logoutAssets;

window.loadAssets =
    loadAssets;