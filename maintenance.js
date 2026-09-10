// =====================================================
// FLEETWOOD IT SUPPORT CENTER
// MAINTENANCE MANAGEMENT JAVASCRIPT
// =====================================================


// =====================================================
// SUPABASE CONFIGURATION
// =====================================================

const SUPABASE_URL = "https://xcfobyusisjbfbnsohjz.supabase.co";

const SUPABASE_ANON_KEY =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhjZm9ieXVzaXNqYmZibnNvaGp6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg3ODc5NzEsImV4cCI6MjEwNDM2Mzk3MX0.ATSzb3RKqGDNPEL_YdORwBzsQJPMIqONzJJaG7LW9YU";


const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
);


// =====================================================
// GLOBAL VARIABLES
// =====================================================

let currentUser = null;
let currentRole = null;

let allMaintenance = [];
let allAssets = [];


// =====================================================
// PAGE START
// =====================================================

document.addEventListener("DOMContentLoaded", async () => {

    console.log("Fleetwood Maintenance System starting...");

    await checkMaintenanceSession();

});


// =====================================================
// CHECK LOGIN SESSION
// =====================================================

async function checkMaintenanceSession() {

    try {

        const {
            data: { session },
            error
        } = await supabaseClient.auth.getSession();


        if (error) {

            console.error("Session error:", error);

            window.location.href = "index.html";

            return;

        }


        if (!session) {

            window.location.href = "index.html";

            return;

        }


        currentUser = session.user;


        // Get user profile

        const {
            data: profile,
            error: profileError
        } = await supabaseClient
            .from("user_profiles")
            .select("id, full_name, role")
            .eq("id", currentUser.id)
            .maybeSingle();


        if (profileError) {

            console.error("Profile error:", profileError);

        }


        currentRole =
            String(profile?.role || "")
                .trim()
                .toLowerCase();


        // Only IT, Manager and Admin

        if (
            currentRole !== "it" &&
            currentRole !== "manager" &&
            currentRole !== "admin"
        ) {

            alert("You do not have permission to access Maintenance.");

            window.location.href = "index.html";

            return;

        }


        updateUserInformation(
            profile?.full_name || currentUser.email
        );


        // Load everything

        await loadAssets();

        await loadMaintenance();


        // Set today's date

        setDefaultMaintenanceDate();


        // Setup filters

        setupMaintenanceFilters();


        // Setup form

        setupMaintenanceForm();


        // Hide editing controls for manager/admin

        if (
            currentRole === "manager" ||
            currentRole === "admin"
        ) {

            disableMaintenanceEditing();

        }


        console.log(
            "Maintenance system ready. Role:",
            currentRole
        );


    } catch (error) {

        console.error(
            "Maintenance initialization error:",
            error
        );

        alert(
            "Unable to load Maintenance. Please login again."
        );

        window.location.href = "index.html";

    }

}


// =====================================================
// USER INFORMATION
// =====================================================

function updateUserInformation(name) {

    const nameElement =
        document.getElementById("maintenanceUserName");

    const roleElement =
        document.getElementById("maintenanceUserRole");


    if (nameElement) {

        nameElement.textContent = name;

    }


    if (roleElement) {

        if (currentRole === "it") {

            roleElement.textContent = "IT Officer";

        } else if (currentRole === "manager") {

            roleElement.textContent = "Manager";

        } else if (currentRole === "admin") {

            roleElement.textContent = "Administrator";

        }

    }

}


// =====================================================
// ROLE FORMATTER
// =====================================================

function formatRole(role) {

    const value =
        String(role || "")
            .trim()
            .toLowerCase();


    if (value === "it") {

        return "IT Officer";

    }


    if (value === "manager") {

        return "Manager";

    }


    if (value === "admin") {

        return "Administrator";

    }


    return "User";

}


// =====================================================
// LOAD ASSETS
// =====================================================

async function loadAssets() {

    try {

        const {
            data,
            error
        } = await supabaseClient
            .from("assets")
            .select(
                "id, asset_type, asset_name, serial_number, asset_tag, branch, assigned_to, condition, status"
            )
            .order("asset_name", {
                ascending: true
            });


        if (error) {

            console.error(
                "Asset loading error:",
                error
            );

            showMaintenanceNotification(
                "Unable to load IT assets.",
                "error"
            );

            return;

        }


        allAssets = data || [];


        populateAssetSelect();


    } catch (error) {

        console.error(
            "Asset error:",
            error
        );

    }

}


// =====================================================
// POPULATE ASSET DROPDOWN
// =====================================================

function populateAssetSelect() {

    const select =
        document.getElementById("maintenanceAsset");


    if (!select) {

        return;

    }


    select.innerHTML =
        `<option value="">Select asset</option>`;


    allAssets.forEach(asset => {

        const option =
            document.createElement("option");


        option.value = asset.id;


        let label =
            formatAssetId(asset.id) +
            " - " +
            (asset.asset_name || "Unnamed Asset");


        if (asset.asset_tag) {

            label +=
                " [" +
                asset.asset_tag +
                "]";

        }


        if (asset.serial_number) {

            label +=
                " - S/N: " +
                asset.serial_number;

        }


        option.textContent = label;


        select.appendChild(option);

    });

}


// =====================================================
// ASSET ID FORMATTER
// =====================================================

function formatAssetId(id) {

    if (id === null || id === undefined) {

        return "AST-000";

    }


    const value = String(id);


    if (/^\d+$/.test(value)) {

        return "AST-" +
            value.padStart(3, "0");

    }


    return "AST-" +
        value.substring(0, 8).toUpperCase();

}


// =====================================================
// LOAD MAINTENANCE RECORDS
// =====================================================

async function loadMaintenance() {

    try {

        const tableBody =
            document.getElementById(
                "maintenanceTableBody"
            );


        if (tableBody) {

            tableBody.innerHTML = `
                <tr>
                    <td colspan="9">
                        Loading maintenance records...
                    </td>
                </tr>
            `;

        }


        const {
            data,
            error
        } = await supabaseClient
            .from("maintenance")
            .select("*")
            .order("created_at", {
                ascending: false
            });


        if (error) {

            console.error(
                "Maintenance loading error:",
                error
            );


            if (tableBody) {

                tableBody.innerHTML = `
                    <tr>
                        <td colspan="9">
                            Unable to load maintenance records.
                        </td>
                    </tr>
                `;

            }


            showMaintenanceNotification(
                "Unable to load maintenance records.",
                "error"
            );


            return;

        }


        allMaintenance = data || [];


        renderMaintenance(allMaintenance);

        updateMaintenanceStatistics(
            allMaintenance
        );

        renderMaintenanceHistory(
            allMaintenance
        );


    } catch (error) {

        console.error(
            "Maintenance loading error:",
            error
        );

    }

}


// =====================================================
// RENDER MAINTENANCE TABLE
// =====================================================

function renderMaintenance(records) {

    const tableBody =
        document.getElementById(
            "maintenanceTableBody"
        );


    if (!tableBody) {

        return;

    }


    if (!records.length) {

        tableBody.innerHTML = `
            <tr>
                <td colspan="9">
                    No maintenance records found.
                </td>
            </tr>
        `;

        return;

    }


    tableBody.innerHTML = records
        .map(record => {


            const asset =
                findAsset(record.asset_id);


            const assetName =
                asset?.asset_name ||
                record.asset_name ||
                "Unknown Asset";


            const status =
                record.status ||
                "Pending";


            const priority =
                record.priority ||
                "Normal";


            const date =
                formatDate(record.maintenance_date);


            return `

                <tr>

                    <td>
                        <strong>
                            ${escapeHTML(
                                formatMaintenanceId(
                                    record.id
                                )
                            )}
                        </strong>
                    </td>


                    <td>

                        <strong>
                            ${escapeHTML(assetName)}
                        </strong>

                        ${
                            asset?.asset_tag
                                ? `
                                    <small
                                        style="
                                            display:block;
                                            margin-top:4px;
                                            opacity:.65;
                                        "
                                    >
                                        ${escapeHTML(
                                            asset.asset_tag
                                        )}
                                    </small>
                                `
                                : ""
                        }

                    </td>


                    <td>
                        ${escapeHTML(
                            record.maintenance_type ||
                            "Other"
                        )}
                    </td>


                    <td>
                        ${escapeHTML(
                            record.problem_description ||
                            record.description ||
                            "-"
                        )}
                    </td>


                    <td>
                        ${escapeHTML(
                            record.technician ||
                            "-"
                        )}
                    </td>


                    <td>

                        <span
                            class="maintenance-priority ${priorityClass(
                                priority
                            )}"
                        >
                            ${escapeHTML(priority)}
                        </span>

                    </td>


                    <td>

                        <span
                            class="maintenance-status ${statusClass(
                                status
                            )}"
                        >
                            ${escapeHTML(status)}
                        </span>

                    </td>


                    <td>
                        ${escapeHTML(date)}
                    </td>


                    <td>

                        ${
                            currentRole === "it"
                                ? `

                                    <button
                                        type="button"
                                        class="view-btn"
                                        onclick="editMaintenance('${record.id}')"
                                    >
                                        Edit
                                    </button>

                                    <button
                                        type="button"
                                        class="view-btn"
                                        onclick="deleteMaintenance('${record.id}')"
                                        style="margin-left:5px;"
                                    >
                                        Delete
                                    </button>

                                `
                                : `

                                    <button
                                        type="button"
                                        class="view-btn"
                                        onclick="viewMaintenance('${record.id}')"
                                    >
                                        View
                                    </button>

                                `
                        }

                    </td>

                </tr>

            `;

        })
        .join("");

}


// =====================================================
// MAINTENANCE ID
// =====================================================

function formatMaintenanceId(id) {

    if (id === null || id === undefined) {

        return "MNT-000";

    }


    const value = String(id);


    if (/^\d+$/.test(value)) {

        return "MNT-" +
            value.padStart(3, "0");

    }


    return "MNT-" +
        value.substring(0, 8).toUpperCase();

}


// =====================================================
// FIND ASSET
// =====================================================

function findAsset(id) {

    return allAssets.find(
        asset =>
            String(asset.id) === String(id)
    );

}


// =====================================================
// STATUS CLASS
// =====================================================

function statusClass(status) {

    const value =
        String(status || "")
            .toLowerCase();


    if (value === "completed") {

        return "completed";

    }


    if (value === "in progress") {

        return "in-progress";

    }


    if (value === "cancelled") {

        return "cancelled";

    }


    return "pending";

}


// =====================================================
// PRIORITY CLASS
// =====================================================

function priorityClass(priority) {

    const value =
        String(priority || "")
            .toLowerCase();


    if (value === "critical") {

        return "critical";

    }


    if (value === "high") {

        return "high";

    }


    if (value === "low") {

        return "low";

    }


    return "normal";

}


// =====================================================
// STATISTICS
// =====================================================

function updateMaintenanceStatistics(records) {

    const total =
        records.length;


    const pending =
        records.filter(
            record =>
                String(record.status || "")
                    .toLowerCase() === "pending"
        ).length;


    const progress =
        records.filter(
            record =>
                String(record.status || "")
                    .toLowerCase() === "in progress"
        ).length;


    const completed =
        records.filter(
            record =>
                String(record.status || "")
                    .toLowerCase() === "completed"
        ).length;


    setText(
        "totalMaintenance",
        total
    );


    setText(
        "pendingMaintenance",
        pending
    );


    setText(
        "progressMaintenance",
        progress
    );


    setText(
        "completedMaintenance",
        completed
    );

}


// =====================================================
// RECENT COMPLETED HISTORY
// =====================================================

function renderMaintenanceHistory(records) {

    const body =
        document.getElementById(
            "maintenanceHistoryBody"
        );


    if (!body) {

        return;

    }


    const completed =
        records
            .filter(
                record =>
                    String(record.status || "")
                        .toLowerCase() === "completed"
            )
            .slice(0, 10);


    if (!completed.length) {

        body.innerHTML = `
            <tr>
                <td colspan="6">
                    No completed maintenance records yet.
                </td>
            </tr>
        `;

        return;

    }


    body.innerHTML =
        completed
            .map(record => {

                const asset =
                    findAsset(record.asset_id);


                const assetName =
                    asset?.asset_name ||
                    record.asset_name ||
                    "Unknown Asset";


                const cost =
                    Number(record.cost || 0);


                return `

                    <tr>

                        <td>
                            ${escapeHTML(assetName)}
                        </td>

                        <td>
                            ${escapeHTML(
                                record.maintenance_type ||
                                "Other"
                            )}
                        </td>

                        <td>
                            ${escapeHTML(
                                record.technician ||
                                "-"
                            )}
                        </td>

                        <td>
                            ₦${cost.toLocaleString(
                                "en-NG",
                                {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2
                                }
                            )}
                        </td>

                        <td>
                            ${escapeHTML(
                                formatDate(
                                    record.actual_completion_date ||
                                    record.maintenance_date
                                )
                            )}
                        </td>

                        <td>
                            ${escapeHTML(
                                record.notes ||
                                "-"
                            )}
                        </td>

                    </tr>

                `;

            })
            .join("");

}


// =====================================================
// FILTER SETUP
// =====================================================

function setupMaintenanceFilters() {

    const search =
        document.getElementById(
            "maintenanceSearch"
        );


    const status =
        document.getElementById(
            "maintenanceStatusFilter"
        );


    const type =
        document.getElementById(
            "maintenanceTypeFilter"
        );


    const priority =
        document.getElementById(
            "maintenancePriorityFilter"
        );


    if (search) {

        search.addEventListener(
            "input",
            filterMaintenance
        );

    }


    if (status) {

        status.addEventListener(
            "change",
            filterMaintenance
        );

    }


    if (type) {

        type.addEventListener(
            "change",
            filterMaintenance
        );

    }


    if (priority) {

        priority.addEventListener(
            "change",
            filterMaintenance
        );

    }

}


// =====================================================
// FILTER MAINTENANCE
// =====================================================

function filterMaintenance() {

    const search =
        (
            document.getElementById(
                "maintenanceSearch"
            )?.value || ""
        )
        .trim()
        .toLowerCase();


    const status =
        document.getElementById(
            "maintenanceStatusFilter"
        )?.value || "";


    const type =
        document.getElementById(
            "maintenanceTypeFilter"
        )?.value || "";


    const priority =
        document.getElementById(
            "maintenancePriorityFilter"
        )?.value || "";


    const filtered =
        allMaintenance.filter(record => {


            const asset =
                findAsset(record.asset_id);


            const searchable =
                [

                    record.id,

                    record.asset_name,

                    record.problem_description,

                    record.description,

                    record.technician,

                    record.maintenance_type,

                    asset?.asset_name,

                    asset?.asset_tag,

                    asset?.serial_number,

                    asset?.branch

                ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase();


            const matchesSearch =
                !search ||
                searchable.includes(search);


            const matchesStatus =
                !status ||
                record.status === status;


            const matchesType =
                !type ||
                record.maintenance_type === type;


            const matchesPriority =
                !priority ||
                record.priority === priority;


            return (
                matchesSearch &&
                matchesStatus &&
                matchesType &&
                matchesPriority
            );

        });


    renderMaintenance(filtered);

}


// =====================================================
// SET DEFAULT DATE
// =====================================================

function setDefaultMaintenanceDate() {

    const dateInput =
        document.getElementById(
            "maintenanceDate"
        );


    if (!dateInput) {

        return;

    }


    if (!dateInput.value) {

        const today =
            new Date()
                .toISOString()
                .split("T")[0];


        dateInput.value = today;

    }

}


// =====================================================
// FORM SETUP
// =====================================================

function setupMaintenanceForm() {

    const form =
        document.getElementById(
            "maintenanceForm"
        );


    if (!form) {

        return;

    }


    form.addEventListener(
        "submit",
        async event => {

            event.preventDefault();

            await saveMaintenance();

        }
    );

}


// =====================================================
// OPEN FORM
// =====================================================

function openMaintenanceForm() {

    if (currentRole !== "it") {

        showMaintenanceNotification(
            "Only IT Officers can create maintenance records.",
            "error"
        );

        return;

    }


    const modal =
        document.getElementById(
            "maintenanceModal"
        );


    const form =
        document.getElementById(
            "maintenanceForm"
        );


    if (!modal) {

        return;

    }


    if (form) {

        form.reset();

    }


    setText(
        "maintenanceSubmitButton",
        "Save Maintenance"
    );


    const id =
        document.getElementById(
            "maintenanceId"
        );


    if (id) {

        id.value = "";

    }


    setDefaultMaintenanceDate();


    modal.classList.add("show");

}


// =====================================================
// CLOSE FORM
// =====================================================

function closeMaintenanceForm() {

    const modal =
        document.getElementById(
            "maintenanceModal"
        );


    if (modal) {

        modal.classList.remove("show");

    }

}


// =====================================================
// SAVE MAINTENANCE
// =====================================================

async function saveMaintenance() {

    if (currentRole !== "it") {

        showMaintenanceNotification(
            "You do not have permission to save maintenance records.",
            "error"
        );

        return;

    }


    const id =
        document.getElementById(
            "maintenanceId"
        )?.value;


    const assetId =
        document.getElementById(
            "maintenanceAsset"
        )?.value;


    const type =
        document.getElementById(
            "maintenanceType"
        )?.value;


    const problem =
        document.getElementById(
            "maintenanceProblem"
        )?.value
        .trim();


    const technician =
        document.getElementById(
            "maintenanceTechnician"
        )?.value
        .trim();


    const priority =
        document.getElementById(
            "maintenancePriority"
        )?.value;


    const status =
        document.getElementById(
            "maintenanceStatus"
        )?.value;


    const maintenanceDate =
        document.getElementById(
            "maintenanceDate"
        )?.value;


    const expectedDate =
        document.getElementById(
            "expectedCompletionDate"
        )?.value ||
        null;


    const actualDate =
        document.getElementById(
            "actualCompletionDate"
        )?.value ||
        null;


    const costValue =
        document.getElementById(
            "maintenanceCost"
        )?.value;


    const notes =
        document.getElementById(
            "maintenanceNotes"
        )?.value
        .trim();


    if (!assetId) {

        alert("Please select an asset.");

        return;

    }


    if (!type) {

        alert("Please select the maintenance type.");

        return;

    }


    if (!problem) {

        alert(
            "Please enter the problem or service description."
        );

        return;

    }


    const asset =
        findAsset(assetId);


    const maintenanceData = {

        asset_id: assetId,

        asset_name:
            asset?.asset_name || null,

        maintenance_type:
            type,

        problem_description:
            problem,

        technician:
            technician || null,

        priority:
            priority,

        status:
            status,

        maintenance_date:
            maintenanceDate,

        expected_completion_date:
            expectedDate,

        actual_completion_date:
            actualDate,

        cost:
            costValue
                ? Number(costValue)
                : 0,

        notes:
            notes || null,

        created_by:
            currentUser.id

    };


    try {

        let error = null;


        if (id) {

            const result =
                await supabaseClient
                    .from("maintenance")
                    .update(
                        maintenanceData
                    )
                    .eq("id", id);


            error = result.error;


        } else {

            const result =
                await supabaseClient
                    .from("maintenance")
                    .insert(
                        maintenanceData
                    );


            error = result.error;

        }


        if (error) {

            console.error(
                "Save maintenance error:",
                error
            );


            showMaintenanceNotification(
                "Unable to save maintenance record: " +
                error.message,
                "error"
            );


            return;

        }


        // Update asset status

        await updateAssetStatusFromMaintenance(
            assetId,
            status
        );


        showMaintenanceNotification(
            id
                ? "Maintenance record updated successfully."
                : "Maintenance record created successfully.",
            "success"
        );


        closeMaintenanceForm();


        await loadAssets();

        await loadMaintenance();


    } catch (error) {

        console.error(
            "Save maintenance error:",
            error
        );


        showMaintenanceNotification(
            "Something went wrong while saving.",
            "error"
        );

    }

}


// =====================================================
// UPDATE ASSET STATUS
// =====================================================

async function updateAssetStatusFromMaintenance(
    assetId,
    maintenanceStatus
) {

    if (!assetId) {

        return;

    }


    let newAssetStatus = null;


    if (
        maintenanceStatus === "Pending" ||
        maintenanceStatus === "In Progress"
    ) {

        newAssetStatus =
            "Under Maintenance";

    }


    if (maintenanceStatus === "Completed") {

        newAssetStatus =
            "Available";

    }


    if (maintenanceStatus === "Cancelled") {

        newAssetStatus =
            "Available";

    }


    if (!newAssetStatus) {

        return;

    }


    try {

        const {
            error
        } = await supabaseClient
            .from("assets")
            .update({
                status: newAssetStatus,
                updated_at:
                    new Date().toISOString()
            })
            .eq("id", assetId);


        if (error) {

            console.error(
                "Asset status update error:",
                error
            );

        }

    } catch (error) {

        console.error(
            "Asset status update error:",
            error
        );

    }

}


// =====================================================
// EDIT MAINTENANCE
// =====================================================

async function editMaintenance(id) {

    if (currentRole !== "it") {

        showMaintenanceNotification(
            "Manager/Admin accounts are view-only.",
            "error"
        );

        return;

    }


    const record =
        allMaintenance.find(
            item =>
                String(item.id) === String(id)
        );


    if (!record) {

        alert(
            "Maintenance record could not be found."
        );

        return;

    }


    const modal =
        document.getElementById(
            "maintenanceModal"
        );


    if (!modal) {

        return;

    }


    document.getElementById(
        "maintenanceId"
    ).value =
        record.id;


    document.getElementById(
        "maintenanceAsset"
    ).value =
        record.asset_id || "";


    document.getElementById(
        "maintenanceType"
    ).value =
        record.maintenance_type || "";


    document.getElementById(
        "maintenanceProblem"
    ).value =
        record.problem_description ||
        record.description ||
        "";


    document.getElementById(
        "maintenanceTechnician"
    ).value =
        record.technician || "";


    document.getElementById(
        "maintenancePriority"
    ).value =
        record.priority || "Normal";


    document.getElementById(
        "maintenanceStatus"
    ).value =
        record.status || "Pending";


    document.getElementById(
        "maintenanceDate"
    ).value =
        normalizeDateInput(
            record.maintenance_date
        );


    document.getElementById(
        "expectedCompletionDate"
    ).value =
        normalizeDateInput(
            record.expected_completion_date
        );


    document.getElementById(
        "actualCompletionDate"
    ).value =
        normalizeDateInput(
            record.actual_completion_date
        );


    document.getElementById(
        "maintenanceCost"
    ).value =
        record.cost || "";


    document.getElementById(
        "maintenanceNotes"
    ).value =
        record.notes || "";


    setText(
        "maintenanceSubmitButton",
        "Update Maintenance"
    );


    modal.classList.add("show");

}


// =====================================================
// VIEW MAINTENANCE
// =====================================================

function viewMaintenance(id) {

    const record =
        allMaintenance.find(
            item =>
                String(item.id) === String(id)
        );


    if (!record) {

        alert(
            "Maintenance record could not be found."
        );

        return;

    }


    const asset =
        findAsset(record.asset_id);


    const message =

        "Maintenance: " +
        formatMaintenanceId(record.id) +

        "\n\nAsset: " +
        (
            asset?.asset_name ||
            record.asset_name ||
            "Unknown Asset"
        ) +

        "\n\nType: " +
        (
            record.maintenance_type ||
            "-"
        ) +

        "\n\nProblem / Service: " +
        (
            record.problem_description ||
            record.description ||
            "-"
        ) +

        "\n\nTechnician: " +
        (
            record.technician ||
            "-"
        ) +

        "\n\nPriority: " +
        (
            record.priority ||
            "Normal"
        ) +

        "\n\nStatus: " +
        (
            record.status ||
            "Pending"
        ) +

        "\n\nDate: " +
        formatDate(
            record.maintenance_date
        ) +

        "\n\nExpected Completion: " +
        formatDate(
            record.expected_completion_date
        ) +

        "\n\nActual Completion: " +
        formatDate(
            record.actual_completion_date
        ) +

        "\n\nCost: ₦" +
        Number(
            record.cost || 0
        ).toLocaleString(
            "en-NG",
            {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            }
        ) +

        "\n\nNotes: " +
        (
            record.notes ||
            "-"
        );


    alert(message);

}


// =====================================================
// DELETE MAINTENANCE
// =====================================================

async function deleteMaintenance(id) {

    if (currentRole !== "it") {

        showMaintenanceNotification(
            "You do not have permission to delete records.",
            "error"
        );

        return;

    }


    const confirmed =
        confirm(
            "Are you sure you want to delete this maintenance record?"
        );


    if (!confirmed) {

        return;

    }


    try {

        const record =
            allMaintenance.find(
                item =>
                    String(item.id) === String(id)
            );


        const {
            error
        } = await supabaseClient
            .from("maintenance")
            .delete()
            .eq("id", id);


        if (error) {

            console.error(
                "Delete maintenance error:",
                error
            );


            showMaintenanceNotification(
                "Unable to delete maintenance record: " +
                error.message,
                "error"
            );


            return;

        }


        showMaintenanceNotification(
            "Maintenance record deleted.",
            "success"
        );


        await loadMaintenance();


        // If this was the only maintenance record
        // affecting the asset, refresh asset list.

        if (record?.asset_id) {

            await loadAssets();

        }


    } catch (error) {

        console.error(
            "Delete maintenance error:",
            error
        );


        showMaintenanceNotification(
            "Something went wrong while deleting.",
            "error"
        );

    }

}


// =====================================================
// DISABLE MANAGER/ADMIN EDITING
// =====================================================

function disableMaintenanceEditing() {

    const newButton =
        document.querySelector(
            ".new-ticket-btn"
        );


    if (newButton) {

        newButton.style.display =
            "none";

    }


    const sidebarNewMaintenance =
        document.querySelector(
            'a[href="maintenance.html"].active'
        );


    // Keep the Maintenance navigation item.
    // Only editing controls are disabled.

}


// =====================================================
// LOGOUT
// =====================================================

async function logoutMaintenance() {

    try {

        await supabaseClient.auth.signOut();

    } catch (error) {

        console.error(
            "Logout error:",
            error
        );

    }


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

function showMaintenanceNotification(
    message,
    type = "success"
) {

    const existing =
        document.querySelector(
            ".maintenance-notification"
        );


    if (existing) {

        existing.remove();

    }


    const notification =
        document.createElement("div");


    notification.className =
        "maintenance-notification";


    notification.textContent =
        message;


    notification.style.position =
        "fixed";


    notification.style.top =
        "25px";


    notification.style.right =
        "25px";


    notification.style.zIndex =
        "99999";


    notification.style.padding =
        "15px 20px";


    notification.style.borderRadius =
        "12px";


    notification.style.fontWeight =
        "600";


    notification.style.boxShadow =
        "0 15px 40px rgba(0,0,0,.25)";


    if (type === "error") {

        notification.style.background =
            "#ffe5e5";

        notification.style.color =
            "#b42318";

    } else {

        notification.style.background =
            "#e7f8ef";

        notification.style.color =
            "#087443";

    }


    document.body.appendChild(
        notification
    );


    setTimeout(
        () => {

            notification.remove();

        },
        4000
    );

}


// =====================================================
// TEXT HELPER
// =====================================================

function setText(
    elementId,
    value
) {

    const element =
        document.getElementById(
            elementId
        );


    if (element) {

        element.textContent =
            value;

    }

}


// =====================================================
// DATE FORMATTER
// =====================================================

function formatDate(value) {

    if (!value) {

        return "-";

    }


    const date =
        new Date(value);


    if (Number.isNaN(
        date.getTime()
    )) {

        return String(value);

    }


    return date.toLocaleDateString(
        "en-NG",
        {
            day: "2-digit",
            month: "short",
            year: "numeric"
        }
    );

}


// =====================================================
// NORMALIZE DATE FOR INPUT
// =====================================================

function normalizeDateInput(value) {

    if (!value) {

        return "";

    }


    const stringValue =
        String(value);


    if (
        /^\d{4}-\d{2}-\d{2}$/
            .test(stringValue)
    ) {

        return stringValue;

    }


    const date =
        new Date(value);


    if (Number.isNaN(
        date.getTime()
    )) {

        return "";

    }


    return date
        .toISOString()
        .split("T")[0];

}


// =====================================================
// HTML ESCAPE
// =====================================================

function escapeHTML(value) {

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
// CLOSE MODAL WHEN CLICKING OUTSIDE
// =====================================================

document.addEventListener(
    "click",
    event => {

        const modal =
            document.getElementById(
                "maintenanceModal"
            );


        if (
            modal &&
            event.target === modal
        ) {

            closeMaintenanceForm();

        }

    }
);


// =====================================================
// KEYBOARD ESCAPE
// =====================================================

document.addEventListener(
    "keydown",
    event => {

        if (
            event.key === "Escape"
        ) {

            closeMaintenanceForm();

        }

    }
);


// =====================================================
// AUTO REFRESH
// =====================================================

setInterval(
    async () => {

        if (
            document.visibilityState ===
            "visible"
        ) {

            await loadAssets();

            await loadMaintenance();

        }

    },
    60000
);


// =====================================================
// EXPOSE FUNCTIONS TO HTML
// =====================================================

window.openMaintenanceForm =
    openMaintenanceForm;

window.closeMaintenanceForm =
    closeMaintenanceForm;

window.loadMaintenance =
    loadMaintenance;

window.editMaintenance =
    editMaintenance;

window.viewMaintenance =
    viewMaintenance;

window.deleteMaintenance =
    deleteMaintenance;

window.logoutMaintenance =
    logoutMaintenance;