// =====================================================
// FLEETWOOD IT SUPPORT CENTER
// STAFF DIRECTORY JAVASCRIPT
// =====================================================

// =====================================================
// SUPABASE CONFIG
// =====================================================

const SUPABASE_URL = "https://xcfobyusisjbfbnsohjz.supabase.co";

const SUPABASE_ANON_KEY =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhjZm9ieXVzaXNqYmZibnNvaGp6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg3ODc5NzEsImV4cCI6MjEwNDM2Mzk3MX0.ATSzb3RKqGDNPEL_YdORwBzsQJPMIqONzJJaG7LW9YU";


// =====================================================
// SUPABASE CLIENT
// =====================================================

let supabaseClient = null;

try {

    if (window.supabase) {

        supabaseClient = window.supabase.createClient(
            SUPABASE_URL,
            SUPABASE_ANON_KEY
        );

    } else {

        console.error("Supabase library was not loaded.");

    }

} catch (error) {

    console.error("Supabase initialization error:", error);

}


// =====================================================
// GLOBAL VARIABLES
// =====================================================

let currentUser = null;
let currentRole = "";
let currentStaffId = null;

let allStaff = [];
let allDeviceChanges = [];


// =====================================================
// PAGE INITIALIZATION
// =====================================================

document.addEventListener("DOMContentLoaded", function () {

    console.log("Staff Directory loaded.");

    checkStaffSession();

});


// =====================================================
// CHECK SESSION
// =====================================================

async function checkStaffSession() {

    try {

        if (!supabaseClient) {

            showNotification(
                "Supabase could not be loaded.",
                "error"
            );

            return;
        }

        const {
            data: {
                session
            }
        } = await supabaseClient.auth.getSession();


        if (!session) {

            window.location.href = "index.html";

            return;
        }


        currentUser = session.user;


        // -------------------------------------------------
        // GET USER PROFILE
        // -------------------------------------------------

        const {
            data: profile,
            error: profileError
        } = await supabaseClient
            .from("user_profiles")
            .select("*")
            .eq("id", currentUser.id)
            .maybeSingle();


        if (profileError) {

            console.error(
                "Profile error:",
                profileError
            );

        }


        if (profile) {

            currentRole =
                String(profile.role || "")
                    .trim()
                    .toLowerCase();

        }


        // -------------------------------------------------
        // FALLBACK TO LOCAL STORAGE
        // -------------------------------------------------

        if (!currentRole) {

            currentRole =
                String(
                    (localStorage.getItem("fleetwoodRole") || localStorage.getItem("userRole")) || ""
                )
                    .trim()
                    .toLowerCase();

        }


        console.log(
            "Current role:",
            currentRole
        );


        // -------------------------------------------------
        // ALLOWED ROLES
        // -------------------------------------------------

        if (
            currentRole !== "it" &&
            currentRole !== "manager" &&
            currentRole !== "admin"
        ) {

            alert(
                "You do not have permission to access Staff Directory."
            );

            window.location.href = "index.html";

            return;
        }


        // -------------------------------------------------
        // SAVE SESSION INFO
        // -------------------------------------------------

        localStorage.setItem(
            "userRole",
            currentRole
        );

        localStorage.setItem(
            "userName",
            profile?.full_name ||
            profile?.name ||
            currentUser.email ||
            "User"
        );

        localStorage.setItem(
            "userEmail",
            currentUser.email || ""
        );

        localStorage.setItem(
            "userId",
            currentUser.id
        );


        // -------------------------------------------------
        // UPDATE USER INFORMATION
        // -------------------------------------------------

        setUserInformation();

        applyStaffPermissions();


        // -------------------------------------------------
        // LOAD DATA
        // -------------------------------------------------

        await loadStaff();

        await loadDeviceChanges();

        renderStaff();

        updateStaffSummary();

        populateDepartmentFilter();

        setupStaffEvents();


    } catch (error) {

        console.error(
            "Session check error:",
            error
        );

        showNotification(
            "Unable to load Staff Directory.",
            "error"
        );

    }

}


// =====================================================
// USER INFORMATION
// =====================================================

function setUserInformation() {

    const name =
        (localStorage.getItem("fleetwoodUserName") || localStorage.getItem("userName")) ||
        currentUser?.email ||
        "User";

    const role =
        currentRole === "it"
            ? "IT Officer"
            : currentRole === "manager"
                ? "Manager"
                : currentRole === "admin"
                    ? "Administrator"
                    : currentRole;


    setText(
        "staffUserName",
        name
    );


    setText(
        "staffUserRole",
        role
    );


    const avatar =
        document.getElementById(
            "staffUserAvatar"
        );


    if (avatar) {

        avatar.textContent =
            name
                .trim()
                .charAt(0)
                .toUpperCase();

    }

}


// =====================================================
// PERMISSIONS
// =====================================================

function applyStaffPermissions() {

    const isIT =
        currentRole === "it";


    const addButtons = [

        "topAddStaffButton",
        "headerAddStaffButton",
        "historyAddButtonContainer"

    ];


    addButtons.forEach(function (id) {

        const element =
            document.getElementById(id);

        if (!element) return;


        if (isIT) {

            element.style.display = "";

        } else {

            element.style.display = "none";

        }

    });

}


// =====================================================
// LOAD STAFF
// =====================================================

async function loadStaff() {

    try {

        const {
            data,
            error
        } = await supabaseClient
            .from("staff_directory")
            .select("*")
            .order("staff_name", {
                ascending: true
            });


        if (error) {

            console.error(
                "Load staff error:",
                error
            );

            showNotification(
                "Unable to load staff records.",
                "error"
            );

            return;
        }


        allStaff = data || [];


        console.log(
            "Staff loaded:",
            allStaff.length
        );


    } catch (error) {

        console.error(error);

    }

}


// =====================================================
// LOAD DEVICE CHANGES
// =====================================================

async function loadDeviceChanges() {

    try {

        const {
            data,
            error
        } = await supabaseClient
            .from("staff_device_changes")
            .select("*")
            .order("change_date", {
                ascending: false
            });


        if (error) {

            console.error(
                "Device changes error:",
                error
            );

            return;
        }


        allDeviceChanges = data || [];


    } catch (error) {

        console.error(error);

    }

}


// =====================================================
// RENDER STAFF
// =====================================================

function renderStaff() {

    const tableBody =
        document.getElementById(
            "staffTableBody"
        );


    if (!tableBody) return;


    const search =
        (
            document.getElementById(
                "staffSearch"
            )?.value || ""
        )
            .trim()
            .toLowerCase();


    const department =
        document.getElementById(
            "staffDepartmentFilter"
        )?.value || "";


    const status =
        document.getElementById(
            "staffStatusFilter"
        )?.value || "";


    let filtered =
        allStaff.filter(function (staff) {

            const matchesSearch =
                !search ||
                String(
                    staff.staff_name || ""
                )
                    .toLowerCase()
                    .includes(search) ||

                String(
                    staff.department || ""
                )
                    .toLowerCase()
                    .includes(search) ||

                String(
                    staff.phone_number || ""
                )
                    .toLowerCase()
                    .includes(search) ||

                String(
                    staff.laptop_serial_number || ""
                )
                    .toLowerCase()
                    .includes(search);


            const matchesDepartment =
                !department ||
                staff.department === department;


            const matchesStatus =
                !status ||
                staff.staff_status === status;


            return (
                matchesSearch &&
                matchesDepartment &&
                matchesStatus
            );

        });


    tableBody.innerHTML = "";


    if (filtered.length === 0) {

        tableBody.innerHTML = `
            <tr>
                <td colspan="9" style="text-align:center;padding:30px;">
                    No staff records found.
                </td>
            </tr>
        `;

    } else {

        filtered.forEach(function (staff) {

            const changes =
                allDeviceChanges.filter(
                    function (item) {

                        return Number(item.staff_id) ===
                            Number(staff.id);

                    }
                );


            const isIT =
                currentRole === "it";


            const actionButtons = isIT
                ? `
                    <button
                        type="button"
                        class="small-btn"
                        onclick="window.editStaff(${staff.id})"
                    >
                        ✏️
                    </button>

                    <button
                        type="button"
                        class="small-btn danger-btn"
                        onclick="window.deleteStaff(${staff.id})"
                    >
                        🗑️
                    </button>
                  `
                : `
                    <button
                        type="button"
                        class="small-btn"
                        onclick="window.viewStaffHistory(${staff.id})"
                    >
                        👁️
                    </button>
                  `;


            const row =
                document.createElement("tr");


            row.innerHTML = `

                <td>
                    <strong>
                        ${escapeHTML(
                            staff.staff_name || "-"
                        )}
                    </strong>
                </td>

                <td>
                    ${escapeHTML(
                        staff.department || "-"
                    )}
                </td>

                <td>
                    ${escapeHTML(
                        staff.phone_number || "-"
                    )}
                </td>

                <td>
                    ${escapeHTML(
                        staff.current_laptop || "-"
                    )}
                </td>

                <td>
                    ${escapeHTML(
                        staff.laptop_serial_number || "-"
                    )}
                </td>

                <td>
                    ${escapeHTML(
                        staff.other_gadgets || "-"
                    )}
                </td>

                <td>
                    <button
                        type="button"
                        class="history-count"
                        onclick="window.viewStaffHistory(${staff.id})"
                    >
                        ${changes.length}
                    </button>
                </td>

                <td>
                    <span class="status-badge ${
                        staff.staff_status === "Active"
                            ? "status-active"
                            : "status-resigned"
                    }">
                        ${escapeHTML(
                            staff.staff_status || "-"
                        )}
                    </span>
                </td>

                <td>
                    <div class="action-buttons">
                        ${actionButtons}
                    </div>
                </td>

            `;


            tableBody.appendChild(row);

        });

    }


    setText(
        "staffRecordCount",
        `${filtered.length} record${filtered.length === 1 ? "" : "s"}`
    );

}


// =====================================================
// UPDATE SUMMARY
// =====================================================

function updateStaffSummary() {

    const total =
        allStaff.length;


    const active =
        allStaff.filter(
            staff =>
                staff.staff_status === "Active"
        ).length;


    const resigned =
        allStaff.filter(
            staff =>
                staff.staff_status === "Resigned"
        ).length;


    const changes =
        allDeviceChanges.length;


    setText(
        "totalStaff",
        total
    );


    setText(
        "activeStaff",
        active
    );


    setText(
        "resignedStaff",
        resigned
    );


    setText(
        "totalDeviceChanges",
        changes
    );

}


// =====================================================
// DEPARTMENT FILTER
// =====================================================

function populateDepartmentFilter() {

    const select =
        document.getElementById(
            "staffDepartmentFilter"
        );


    if (!select) return;


    const currentValue =
        select.value;


    const departments =
        [
            ...new Set(
                allStaff
                    .map(
                        staff =>
                            String(
                                staff.department || ""
                            ).trim()
                    )
                    .filter(Boolean)
            )
        ]
            .sort();


    select.innerHTML = `
        <option value="">
            All Departments
        </option>
    `;


    departments.forEach(function (department) {

        const option =
            document.createElement("option");


        option.value =
            department;


        option.textContent =
            department;


        select.appendChild(option);

    });


    select.value =
        currentValue;

}


// =====================================================
// SETUP EVENTS
// =====================================================

function setupStaffEvents() {

    const search =
        document.getElementById(
            "staffSearch"
        );


    const department =
        document.getElementById(
            "staffDepartmentFilter"
        );


    const status =
        document.getElementById(
            "staffStatusFilter"
        );


    if (search) {

        search.addEventListener(
            "input",
            renderStaff
        );

    }


    if (department) {

        department.addEventListener(
            "change",
            renderStaff
        );

    }


    if (status) {

        status.addEventListener(
            "change",
            renderStaff
        );

    }


    const staffForm =
        document.getElementById(
            "staffForm"
        );


    if (staffForm) {

        staffForm.addEventListener(
            "submit",
            saveStaff
        );

    }


    const deviceForm =
        document.getElementById(
            "deviceChangeForm"
        );


    if (deviceForm) {

        deviceForm.addEventListener(
            "submit",
            saveDeviceChange
        );

    }


    // -------------------------------------------------
    // CLOSE MODALS BY CLICKING OUTSIDE
    // -------------------------------------------------

    document.addEventListener(
        "click",
        function (event) {

            const staffModal =
                document.getElementById(
                    "staffModal"
                );


            const historyModal =
                document.getElementById(
                    "deviceHistoryModal"
                );


            const deviceModal =
                document.getElementById(
                    "deviceChangeModal"
                );


            if (
                event.target ===
                staffModal
            ) {

                closeStaffForm();

            }


            if (
                event.target ===
                historyModal
            ) {

                closeDeviceHistory();

            }


            if (
                event.target ===
                deviceModal
            ) {

                closeDeviceChangeForm();

            }

        }
    );


    // -------------------------------------------------
    // ESC KEY
    // -------------------------------------------------

    document.addEventListener(
        "keydown",
        function (event) {

            if (event.key !== "Escape") {
                return;
            }


            closeStaffForm();

            closeDeviceHistory();

            closeDeviceChangeForm();

        }
    );

}


// =====================================================
// OPEN STAFF FORM
// =====================================================

function openStaffForm(staffId = null) {

    console.log(
        "openStaffForm called:",
        staffId
    );


    // -------------------------------------------------
    // GET CURRENT ROLE AGAIN
    // -------------------------------------------------

    let role =
        String(
            currentRole ||
            (localStorage.getItem("fleetwoodRole") || localStorage.getItem("userRole")) ||
            ""
        )
            .trim()
            .toLowerCase();


    currentRole = role;


    // -------------------------------------------------
    // IT ONLY
    // -------------------------------------------------

    if (role !== "it") {

        showNotification(
            "Only IT can add or edit staff.",
            "error"
        );

        console.warn(
            "Add Staff blocked. Current role:",
            role
        );

        return;
    }


    // -------------------------------------------------
    // FIND MODAL
    // -------------------------------------------------

    const modal =
        document.getElementById(
            "staffModal"
        );


    const form =
        document.getElementById(
            "staffForm"
        );


    if (!modal) {

        alert(
            "Staff form error: staffModal was not found in the HTML."
        );

        console.error(
            "staffModal not found."
        );

        return;
    }


    if (!form) {

        alert(
            "Staff form error: staffForm was not found in the HTML."
        );

        console.error(
            "staffForm not found."
        );

        return;
    }


    // -------------------------------------------------
    // RESET FORM
    // -------------------------------------------------

    form.reset();


    const staffIdInput =
        document.getElementById(
            "staffId"
        );


    if (staffIdInput) {

        staffIdInput.value = "";

    }


    setText(
        "staffModalTitle",
        "Add Staff"
    );


    const submitButton =
        document.getElementById(
            "staffSubmitButton"
        );


    if (submitButton) {

        submitButton.textContent =
            "Save Staff";

        submitButton.disabled =
            false;

    }


    // -------------------------------------------------
    // EDIT MODE
    // -------------------------------------------------

    if (
        staffId !== null &&
        staffId !== "" &&
        staffId !== undefined
    ) {

        const staff =
            allStaff.find(
                item =>
                    Number(item.id) ===
                    Number(staffId)
            );


        if (!staff) {

            showNotification(
                "Staff record not found.",
                "error"
            );

            return;
        }


        fillStaffForm(staff);

    }


    // -------------------------------------------------
    // OPEN MODAL
    // -------------------------------------------------

    modal.classList.add("active");


    // Extra fallback in case the CSS uses display
    modal.style.display = "flex";


    console.log(
        "Staff modal opened."
    );

}


// =====================================================
// FILL STAFF FORM
// =====================================================

function fillStaffForm(staff) {

    setInputValue(
        "staffId",
        staff.id
    );


    setInputValue(
        "staffName",
        staff.staff_name
    );


    setInputValue(
        "staffDepartment",
        staff.department
    );


    setInputValue(
        "staffPhone",
        staff.phone_number
    );


    setInputValue(
        "staffStatus",
        staff.staff_status || "Active"
    );


    setInputValue(
        "currentLaptop",
        staff.current_laptop
    );


    setInputValue(
        "laptopSerial",
        staff.laptop_serial_number
    );


    setInputValue(
        "laptopAssetTag",
        staff.laptop_asset_tag
    );


    setInputValue(
        "otherGadgets",
        staff.other_gadgets
    );


    setText(
        "staffModalTitle",
        "Edit Staff"
    );


    const submitButton =
        document.getElementById(
            "staffSubmitButton"
        );


    if (submitButton) {

        submitButton.textContent =
            "Update Staff";

    }

}


// =====================================================
// CLOSE STAFF FORM
// =====================================================

function closeStaffForm() {

    const modal =
        document.getElementById(
            "staffModal"
        );


    if (!modal) return;


    modal.classList.remove("active");


    modal.style.display = "none";

}


// =====================================================
// SAVE STAFF
// =====================================================

async function saveStaff(event) {

    if (event) {

        event.preventDefault();

    }


    if (currentRole !== "it") {

        showNotification(
            "Only IT can add or edit staff.",
            "error"
        );

        return;
    }


    const staffId =
        document.getElementById(
            "staffId"
        )?.value;


    const staffName =
        document.getElementById(
            "staffName"
        )?.value.trim();


    const department =
        document.getElementById(
            "staffDepartment"
        )?.value.trim();


    const phone =
        document.getElementById(
            "staffPhone"
        )?.value.trim();


    const status =
        document.getElementById(
            "staffStatus"
        )?.value || "Active";


    const currentLaptop =
        document.getElementById(
            "currentLaptop"
        )?.value.trim();


    const laptopSerial =
        document.getElementById(
            "laptopSerial"
        )?.value.trim();


    const laptopAssetTag =
        document.getElementById(
            "laptopAssetTag"
        )?.value.trim();


    const otherGadgets =
        document.getElementById(
            "otherGadgets"
        )?.value.trim();


    // -------------------------------------------------
    // VALIDATION
    // -------------------------------------------------

    if (!staffName) {

        showNotification(
            "Please enter staff name.",
            "error"
        );

        return;
    }


    if (!department) {

        showNotification(
            "Please enter department.",
            "error"
        );

        return;
    }


    const submitButton =
        document.getElementById(
            "staffSubmitButton"
        );


    if (submitButton) {

        submitButton.disabled = true;

        submitButton.textContent =
            staffId
                ? "Updating..."
                : "Saving...";

    }


    try {

        const record = {

            staff_name: staffName,

            department: department,

            phone_number: phone || null,

            current_laptop:
                currentLaptop || null,

            laptop_serial_number:
                laptopSerial || null,

            laptop_asset_tag:
                laptopAssetTag || null,

            other_gadgets:
                otherGadgets || null,

            staff_status:
                status

        };


        // -------------------------------------------------
        // UPDATE
        // -------------------------------------------------

        if (staffId) {

            const {
                error
            } = await supabaseClient
                .from("staff_directory")
                .update(record)
                .eq(
                    "id",
                    staffId
                );


            if (error) {

                throw error;

            }


            showNotification(
                "Staff record updated successfully.",
                "success"
            );

        }


        // -------------------------------------------------
        // INSERT
        // -------------------------------------------------

        else {

            record.created_by =
                currentUser.id;


            const {
                error
            } = await supabaseClient
                .from("staff_directory")
                .insert([record]);


            if (error) {

                throw error;

            }


            showNotification(
                "Staff added successfully.",
                "success"
            );

        }


        closeStaffForm();


        await loadStaff();

        await loadDeviceChanges();


        renderStaff();

        updateStaffSummary();

        populateDepartmentFilter();


    } catch (error) {

        console.error(
            "Save staff error:",
            error
        );


        showNotification(
            error.message ||
            "Unable to save staff record.",
            "error"
        );

    } finally {

        if (submitButton) {

            submitButton.disabled = false;

            submitButton.textContent =
                staffId
                    ? "Update Staff"
                    : "Save Staff";

        }

    }

}


// =====================================================
// EDIT STAFF
// =====================================================

function editStaff(staffId) {

    openStaffForm(staffId);

}


// =====================================================
// DELETE STAFF
// =====================================================

async function deleteStaff(staffId) {

    if (currentRole !== "it") {

        showNotification(
            "Only IT can delete staff.",
            "error"
        );

        return;
    }


    const staff =
        allStaff.find(
            item =>
                Number(item.id) ===
                Number(staffId)
        );


    if (!staff) return;


    const confirmed =
        confirm(
            `Are you sure you want to delete ${staff.staff_name}?`
        );


    if (!confirmed) return;


    try {

        const {
            error
        } = await supabaseClient
            .from("staff_directory")
            .delete()
            .eq(
                "id",
                staffId
            );


        if (error) {

            throw error;

        }


        showNotification(
            "Staff deleted successfully.",
            "success"
        );


        await loadStaff();

        await loadDeviceChanges();


        renderStaff();

        updateStaffSummary();

        populateDepartmentFilter();


    } catch (error) {

        console.error(
            "Delete staff error:",
            error
        );


        showNotification(
            error.message ||
            "Unable to delete staff.",
            "error"
        );

    }

}


// =====================================================
// GET STAFF DEVICE CHANGES
// =====================================================

function getStaffChanges(staffId) {

    return allDeviceChanges.filter(
        item =>
            Number(item.staff_id) ===
            Number(staffId)
    );

}


// =====================================================
// VIEW STAFF HISTORY
// =====================================================

function viewStaffHistory(staffId) {

    const staff =
        allStaff.find(
            item =>
                Number(item.id) ===
                Number(staffId)
        );


    if (!staff) {

        showNotification(
            "Staff record not found.",
            "error"
        );

        return;
    }


    currentStaffId =
        staff.id;


    setText(
        "historyStaffName",
        staff.staff_name
    );


    const addButton =
        document.getElementById(
            "historyAddButtonContainer"
        );


    if (addButton) {

        addButton.style.display =
            currentRole === "it"
                ? ""
                : "none";

    }


    renderDeviceHistory(
        staff.id
    );


    const modal =
        document.getElementById(
            "deviceHistoryModal"
        );


    if (modal) {

        modal.classList.add("active");

        modal.style.display =
            "flex";

    }

}


// =====================================================
// RENDER DEVICE HISTORY
// =====================================================

function renderDeviceHistory(staffId) {

    const body =
        document.getElementById(
            "deviceHistoryBody"
        );


    if (!body) return;


    const changes =
        getStaffChanges(staffId);


    body.innerHTML = "";


    if (changes.length === 0) {

        body.innerHTML = `
            <tr>
                <td colspan="8" style="text-align:center;padding:30px;">
                    No device changes recorded.
                </td>
            </tr>
        `;

        return;
    }


    changes.forEach(function (change) {

        const row =
            document.createElement("tr");


        const action =
            currentRole === "it"
                ? `
                    <button
                        type="button"
                        class="small-btn"
                        onclick="window.editDeviceChange(${change.id})"
                    >
                        ✏️
                    </button>

                    <button
                        type="button"
                        class="small-btn danger-btn"
                        onclick="window.deleteDeviceChange(${change.id})"
                    >
                        🗑️
                    </button>
                  `
                : "";


        row.innerHTML = `

            <td>
                ${escapeHTML(
                    change.gadget_type || "-"
                )}
            </td>

            <td>
                ${escapeHTML(
                    change.old_device_name || "-"
                )}
            </td>

            <td>
                ${escapeHTML(
                    change.old_serial_number || "-"
                )}
            </td>

            <td>
                ${escapeHTML(
                    change.old_asset_tag || "-"
                )}
            </td>

            <td>
                ${escapeHTML(
                    change.change_reason || "-"
                )}
            </td>

            <td>
                ${formatDate(
                    change.change_date
                )}
            </td>

            <td>
                ${escapeHTML(
                    change.notes || "-"
                )}
            </td>

            <td>
                <div class="action-buttons">
                    ${action}
                </div>
            </td>

        `;


        body.appendChild(row);

    });

}


// =====================================================
// CLOSE DEVICE HISTORY
// =====================================================

function closeDeviceHistory() {

    const modal =
        document.getElementById(
            "deviceHistoryModal"
        );


    if (!modal) return;


    modal.classList.remove("active");

    modal.style.display =
        "none";


    currentStaffId = null;

}


// =====================================================
// OPEN DEVICE CHANGE FORM
// =====================================================

function openDeviceChangeForm(
    staffId = null,
    changeId = null
) {

    if (currentRole !== "it") {

        showNotification(
            "Only IT can record device changes.",
            "error"
        );

        return;
    }


    const modal =
        document.getElementById(
            "deviceChangeModal"
        );


    const form =
        document.getElementById(
            "deviceChangeForm"
        );


    if (!modal || !form) {

        alert(
            "Device change form is missing from the page."
        );

        return;
    }


    form.reset();


    setInputValue(
        "deviceChangeId",
        ""
    );


    setInputValue(
        "deviceChangeStaffId",
        staffId || currentStaffId || ""
    );


    setInputValue(
        "changeDate",
        getToday()
    );


    if (changeId) {

        const change =
            allDeviceChanges.find(
                item =>
                    Number(item.id) ===
                    Number(changeId)
            );


        if (change) {

            fillDeviceChangeForm(
                change
            );

        }

    }


    modal.classList.add("active");

    modal.style.display =
        "flex";

}


// =====================================================
// FILL DEVICE CHANGE FORM
// =====================================================

function fillDeviceChangeForm(change) {

    setInputValue(
        "deviceChangeId",
        change.id
    );


    setInputValue(
        "deviceChangeStaffId",
        change.staff_id
    );


    setInputValue(
        "gadgetType",
        change.gadget_type
    );


    setInputValue(
        "changeDate",
        change.change_date
    );


    setInputValue(
        "oldDeviceName",
        change.old_device_name
    );


    setInputValue(
        "oldSerialNumber",
        change.old_serial_number
    );


    setInputValue(
        "oldAssetTag",
        change.old_asset_tag
    );


    setInputValue(
        "changeReason",
        change.change_reason
    );


    setInputValue(
        "changeNotes",
        change.notes
    );


    setText(
        "deviceChangeModalTitle",
        "Edit Device Change"
    );


    const button =
        document.getElementById(
            "deviceChangeSubmitButton"
        );


    if (button) {

        button.textContent =
            "Update Change";

    }

}


// =====================================================
// CLOSE DEVICE CHANGE FORM
// =====================================================

function closeDeviceChangeForm() {

    const modal =
        document.getElementById(
            "deviceChangeModal"
        );


    if (!modal) return;


    modal.classList.remove("active");

    modal.style.display =
        "none";

}


// =====================================================
// SAVE DEVICE CHANGE
// =====================================================

async function saveDeviceChange(event) {

    if (event) {

        event.preventDefault();

    }


    if (currentRole !== "it") {

        showNotification(
            "Only IT can record device changes.",
            "error"
        );

        return;
    }


    const id =
        document.getElementById(
            "deviceChangeId"
        )?.value;


    const staffId =
        document.getElementById(
            "deviceChangeStaffId"
        )?.value;


    const gadgetType =
        document.getElementById(
            "gadgetType"
        )?.value;


    const changeDate =
        document.getElementById(
            "changeDate"
        )?.value ||
        getToday();


    const oldDeviceName =
        document.getElementById(
            "oldDeviceName"
        )?.value.trim();


    const oldSerialNumber =
        document.getElementById(
            "oldSerialNumber"
        )?.value.trim();


    const oldAssetTag =
        document.getElementById(
            "oldAssetTag"
        )?.value.trim();


    const reason =
        document.getElementById(
            "changeReason"
        )?.value.trim();


    const notes =
        document.getElementById(
            "changeNotes"
        )?.value.trim();


    if (!staffId) {

        showNotification(
            "Staff member is required.",
            "error"
        );

        return;
    }


    if (!gadgetType) {

        showNotification(
            "Please select gadget type.",
            "error"
        );

        return;
    }


    try {

        const record = {

            staff_id:
                Number(staffId),

            gadget_type:
                gadgetType,

            old_device_name:
                oldDeviceName || null,

            old_serial_number:
                oldSerialNumber || null,

            old_asset_tag:
                oldAssetTag || null,

            change_reason:
                reason || null,

            change_date:
                changeDate,

            notes:
                notes || null

        };


        if (id) {

            const {
                error
            } = await supabaseClient
                .from("staff_device_changes")
                .update(record)
                .eq(
                    "id",
                    id
                );


            if (error) {

                throw error;

            }


            showNotification(
                "Device change updated successfully.",
                "success"
            );

        } else {

            record.created_by =
                currentUser.id;


            const {
                error
            } = await supabaseClient
                .from("staff_device_changes")
                .insert([record]);


            if (error) {

                throw error;

            }


            showNotification(
                "Device change recorded successfully.",
                "success"
            );

        }


        closeDeviceChangeForm();


        await loadDeviceChanges();

        await loadStaff();


        renderStaff();

        updateStaffSummary();


        if (currentStaffId) {

            renderDeviceHistory(
                currentStaffId
            );

        }


    } catch (error) {

        console.error(
            "Device change error:",
            error
        );


        showNotification(
            error.message ||
            "Unable to save device change.",
            "error"
        );

    }

}


// =====================================================
// EDIT DEVICE CHANGE
// =====================================================

function editDeviceChange(changeId) {

    openDeviceChangeForm(
        currentStaffId,
        changeId
    );

}


// =====================================================
// DELETE DEVICE CHANGE
// =====================================================

async function deleteDeviceChange(changeId) {

    if (currentRole !== "it") {

        showNotification(
            "Only IT can delete device changes.",
            "error"
        );

        return;
    }


    if (
        !confirm(
            "Are you sure you want to delete this device change?"
        )
    ) {

        return;

    }


    try {

        const {
            error
        } = await supabaseClient
            .from("staff_device_changes")
            .delete()
            .eq(
                "id",
                changeId
            );


        if (error) {

            throw error;

        }


        showNotification(
            "Device change deleted successfully.",
            "success"
        );


        await loadDeviceChanges();


        renderStaff();

        updateStaffSummary();


        if (currentStaffId) {

            renderDeviceHistory(
                currentStaffId
            );

        }


    } catch (error) {

        console.error(
            error
        );


        showNotification(
            error.message ||
            "Unable to delete device change.",
            "error"
        );

    }

}


// =====================================================
// LOGOUT
// =====================================================

async function logoutStaff() {

    try {

        if (supabaseClient) {

            await supabaseClient.auth.signOut();

        }

    } catch (error) {

        console.error(
            "Logout error:",
            error
        );

    }


    localStorage.removeItem(
        "userRole"
    );

    localStorage.removeItem(
        "userName"
    );

    localStorage.removeItem(
        "userEmail"
    );

    localStorage.removeItem(
        "userId"
    );


    window.location.href =
        "index.html";

}


// =====================================================
// NOTIFICATION
// =====================================================

function showNotification(
    message,
    type = "success"
) {

    const container =
        document.getElementById(
            "staffNotification"
        );


    if (!container) {

        alert(message);

        return;
    }


    container.innerHTML = `

        <div class="
            staff-notification
            ${type}
        ">

            <span>
                ${
                    type === "success"
                        ? "✓"
                        : "!"
                }
            </span>

            <div>
                ${escapeHTML(message)}
            </div>

            <button
                type="button"
                onclick="this.parentElement.remove()"
            >
                ×
            </button>

        </div>

    `;


    setTimeout(
        function () {

            const notification =
                container.querySelector(
                    ".staff-notification"
                );


            if (notification) {

                notification.remove();

            }

        },
        4000
    );

}


// =====================================================
// HELPER FUNCTIONS
// =====================================================

function setText(
    id,
    value
) {

    const element =
        document.getElementById(id);


    if (element) {

        element.textContent =
            value ?? "";

    }

}


function setInputValue(
    id,
    value
) {

    const element =
        document.getElementById(id);


    if (element) {

        element.value =
            value ?? "";

    }

}


function escapeHTML(value) {

    if (
        value === null ||
        value === undefined
    ) {

        return "";

    }


    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

}


function formatDate(date) {

    if (!date) return "-";


    try {

        return new Date(
            date + (
                String(date).includes("T")
                    ? ""
                    : "T00:00:00"
            )
        ).toLocaleDateString(
            "en-NG",
            {
                day: "2-digit",
                month: "short",
                year: "numeric"
            }
        );

    } catch (error) {

        return date;

    }

}


function getToday() {

    const now =
        new Date();


    const year =
        now.getFullYear();


    const month =
        String(
            now.getMonth() + 1
        ).padStart(
            2,
            "0"
        );


    const day =
        String(
            now.getDate()
        ).padStart(
            2,
            "0"
        );


    return `${year}-${month}-${day}`;

}


// =====================================================
// AUTO REFRESH
// =====================================================

setInterval(
    async function () {

        if (
            document.visibilityState !==
            "visible"
        ) {

            return;

        }


        if (!currentUser) {

            return;

        }


        try {

            await loadStaff();

            await loadDeviceChanges();


            renderStaff();

            updateStaffSummary();

            populateDepartmentFilter();


        } catch (error) {

            console.error(
                "Auto refresh error:",
                error
            );

        }

    },
    60000
);


// =====================================================
// REFRESH WHEN PAGE BECOMES VISIBLE
// =====================================================

document.addEventListener(
    "visibilitychange",
    async function () {

        if (
            document.visibilityState ===
            "visible" &&
            currentUser
        ) {

            await loadStaff();

            await loadDeviceChanges();


            renderStaff();

            updateStaffSummary();

            populateDepartmentFilter();

        }

    }
);


// =====================================================
// MAKE FUNCTIONS AVAILABLE TO HTML
// =====================================================

window.openStaffForm =
    openStaffForm;

window.closeStaffForm =
    closeStaffForm;

window.editStaff =
    editStaff;

window.deleteStaff =
    deleteStaff;

window.viewStaffHistory =
    viewStaffHistory;

window.closeDeviceHistory =
    closeDeviceHistory;

window.openDeviceChangeForm =
    openDeviceChangeForm;

window.closeDeviceChangeForm =
    closeDeviceChangeForm;

window.editDeviceChange =
    editDeviceChange;

window.deleteDeviceChange =
    deleteDeviceChange;

window.logoutStaff =
    logoutStaff;

window.loadStaff =
    loadStaff;

window.renderStaff =
    renderStaff;

window.saveStaff =
    saveStaff;

window.saveDeviceChange =
    saveDeviceChange;


// =====================================================
// DEBUG
// =====================================================

console.log(
    "staff-directory.js loaded successfully."
);