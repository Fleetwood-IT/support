// =====================================================
// FLEETWOOD IT SUPPORT CENTER
// IT ASSET MANAGEMENT
// VERSION 1.0
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


// =====================================================
// INITIALIZE
// =====================================================

document.addEventListener(
    "DOMContentLoaded",
    async () => {

        setupAssetForm();
        setupAssetFilters();

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


        // Save information
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


        renderBranchSummary(
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
                    asset.condition ||
                    asset.asset_condition ||
                    "Good";


                const status =
                    asset.status ||
                    "Available";


                return `
                    <tr>

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
                                asset.asset_type ||
                                asset.type ||
                                "Other"
                            )}
                        </td>


                        <td>
                            ${escapeHTML(
                                asset.asset_name ||
                                asset.name ||
                                "-"
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
                                asset.branch ||
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
                                            class="btn btn-small"
                                            onclick="editAsset('${escapeHTML(String(asset.id))}')">
                                            Edit
                                        </button>

                                        <button
                                            class="btn btn-small btn-danger"
                                            onclick="deleteAsset('${escapeHTML(String(asset.id))}')">
                                            Delete
                                        </button>
                                      `
                                    : `
                                        <button
                                            class="btn btn-small"
                                            onclick="viewAsset('${escapeHTML(String(asset.id))}')">
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
                String(
                    asset.condition ||
                    asset.asset_condition ||
                    ""
                ).toLowerCase()
                === "good"
        ).length;


    const faulty =
        assets.filter(
            asset =>
                String(
                    asset.condition ||
                    asset.asset_condition ||
                    ""
                ).toLowerCase()
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
// BRANCH SUMMARY
// =====================================================

function renderBranchSummary(
    assets
) {

    const body =
        document.getElementById(
            "branchAssetsBody"
        );


    if (!body) {
        return;
    }


    const branches = {};


    assets.forEach(
        asset => {

            const branch =
                asset.branch ||
                "Unassigned";


            if (!branches[branch]) {

                branches[branch] = {

                    total: 0,
                    good: 0,
                    faulty: 0,
                    inUse: 0,
                    available: 0

                };

            }


            branches[branch].total++;


            const condition =
                String(
                    asset.condition ||
                    asset.asset_condition ||
                    ""
                ).toLowerCase();


            const status =
                String(
                    asset.status ||
                    ""
                ).toLowerCase();


            if (
                condition === "good"
            ) {

                branches[
                    branch
                ].good++;

            }


            if (
                condition === "faulty"
            ) {

                branches[
                    branch
                ].faulty++;

            }


            if (
                status === "in use"
            ) {

                branches[
                    branch
                ].inUse++;

            }


            if (
                status === "available"
            ) {

                branches[
                    branch
                ].available++;

            }

        }
    );


    const names =
        Object.keys(
            branches
        ).sort();


    if (!names.length) {

        body.innerHTML = `
            <tr>
                <td colspan="6">
                    No branch information available.
                </td>
            </tr>
        `;

        return;

    }


    body.innerHTML =
        names.map(
            branch => {

                const item =
                    branches[branch];


                return `
                    <tr>

                        <td>
                            <strong>
                                ${escapeHTML(
                                    branch
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


    [
        search,
        type,
        condition,
        status
    ].forEach(
        element => {

            if (element) {

                element.addEventListener(
                    "input",
                    filterAssets
                );

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

                    asset.asset_name,

                    asset.name,

                    asset.asset_type,

                    asset.type,

                    asset.serial_number,

                    asset.branch,

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


                const assetType =
                    asset.asset_type ||
                    asset.type ||
                    "";


                const assetCondition =
                    asset.condition ||
                    asset.asset_condition ||
                    "";


                const assetStatus =
                    asset.status ||
                    "";


                const matchesType =
                    !type ||
                    assetType === type;


                const matchesCondition =
                    !condition ||
                    assetCondition === condition;


                const matchesStatus =
                    !status ||
                    assetStatus === status;


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
                ).value.trim(),

            asset_tag:
                document.getElementById(
                    "assetTag"
                ).value.trim(),

            branch:
                document.getElementById(
                    "assetBranch"
                ).value.trim(),

            assigned_to:
                document.getElementById(
                    "assignedTo"
                ).value.trim(),

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
                ).value.trim()

        };


        if (
            !assetData.asset_type ||
            !assetData.asset_name ||
            !assetData.branch
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
        asset.asset_type ||
        asset.type ||
        "";


    document.getElementById(
        "assetName"
    ).value =
        asset.asset_name ||
        asset.name ||
        "";


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
        "assetBranch"
    ).value =
        asset.branch ||
        "";


    document.getElementById(
        "assignedTo"
    ).value =
        asset.assigned_to ||
        "";


    document.getElementById(
        "assetCondition"
    ).value =
        asset.condition ||
        asset.asset_condition ||
        "Good";


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


    alert(

        "Asset Details\n\n" +

        "Asset: " +
        (
            asset.asset_name ||
            asset.name ||
            "-"
        ) +

        "\nType: " +
        (
            asset.asset_type ||
            asset.type ||
            "-"
        ) +

        "\nSerial Number: " +
        (
            asset.serial_number ||
            "-"
        ) +

        "\nBranch: " +
        (
            asset.branch ||
            "-"
        ) +

        "\nAssigned To: " +
        (
            asset.assigned_to ||
            "Not Assigned"
        ) +

        "\nCondition: " +
        (
            asset.condition ||
            asset.asset_condition ||
            "-"
        ) +

        "\nStatus: " +
        (
            asset.status ||
            "-"
        )

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
            (
                asset.asset_name ||
                asset.name ||
                "Asset"
            )
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

        }

    }
);


// =====================================================
// GLOBAL FUNCTIONS
// =====================================================

window.openAssetForm =
    openAssetForm;

window.closeAssetForm =
    closeAssetForm;

window.editAsset =
    editAsset;

window.viewAsset =
    viewAsset;

window.deleteAsset =
    deleteAsset;

window.logoutAssets =
    logoutAssets;

window.loadAssets =
    loadAssets;