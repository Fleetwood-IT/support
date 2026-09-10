// =====================================================
// FLEETWOOD IT SUPPORT CENTER
// REPORTS MODULE
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

    console.error(
        "Supabase initialization error:",
        error
    );

}


// =====================================================
// GLOBAL VARIABLES
// =====================================================

let currentUser = null;
let currentRole = "";

let reportTickets = [];
let reportStaff = [];
let reportAssets = [];
let reportMaintenance = [];
let reportDeviceChanges = [];


// =====================================================
// PAGE LOAD
// =====================================================

document.addEventListener(
    "DOMContentLoaded",
    function () {

        setupReportEvents();

        checkReportSession();

    }
);


// =====================================================
// SESSION CHECK
// =====================================================

async function checkReportSession() {

    try {

        if (!supabaseClient) {

            showReportNotification(
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

        let profile = null;

        try {

            const {
                data,
                error
            } = await supabaseClient
                .from("user_profiles")
                .select("*")
                .eq("id", currentUser.id)
                .maybeSingle();


            if (!error) {

                profile = data;

            }

        } catch (profileError) {

            console.warn(
                "Could not load user profile:",
                profileError
            );

        }


        // -------------------------------------------------
        // DETERMINE ROLE
        // -------------------------------------------------

        if (profile && profile.role) {

            currentRole =
                String(profile.role)
                    .trim()
                    .toLowerCase();

        }


        if (!currentRole) {

            currentRole =
                String(
                    (localStorage.getItem("fleetwoodRole") || localStorage.getItem("userRole")) || ""
                )
                .trim()
                .toLowerCase();

        }


        // -------------------------------------------------
        // ALLOWED ROLES
        // -------------------------------------------------

        if (
            currentRole !== "it" &&
            currentRole !== "manager" &&
            currentRole !== "admin"
        ) {

            alert(
                "You do not have permission to access Reports."
            );

            window.location.href = "index.html";

            return;

        }


        setReportUserInformation();


        await loadReports();

    } catch (error) {

        console.error(
            "Report session error:",
            error
        );

        showReportNotification(
            "Unable to load Reports page.",
            "error"
        );

    }

}


// =====================================================
// USER INFORMATION
// =====================================================

function setReportUserInformation() {

    const name =
        (localStorage.getItem("fleetwoodUserName") || localStorage.getItem("userName")) ||
        currentUser?.email ||
        "User";

    let roleLabel = "User";

    if (currentRole === "it") {

        roleLabel = "IT Officer";

    } else if (currentRole === "manager") {

        roleLabel = "Manager";

    } else if (currentRole === "admin") {

        roleLabel = "Administrator";

    }


    setText(
        "reportUserName",
        name
    );

    setText(
        "reportUserRole",
        roleLabel
    );


    const avatar =
        name
            .trim()
            .substring(0, 2)
            .toUpperCase();


    setText(
        "reportUserAvatar",
        avatar
    );

}


// =====================================================
// EVENT SETUP
// =====================================================

function setupReportEvents() {

    const period =
        document.getElementById(
            "reportPeriod"
        );

    if (period) {

        period.addEventListener(
            "change",
            function () {

                const isCustom =
                    this.value === "custom";


                const start =
                    document.getElementById(
                        "reportStartDate"
                    );

                const end =
                    document.getElementById(
                        "reportEndDate"
                    );


                if (start) {

                    start.style.display =
                        isCustom
                            ? "block"
                            : "none";

                }


                if (end) {

                    end.style.display =
                        isCustom
                            ? "block"
                            : "none";

                }


                loadReports();

            }
        );

    }


    const start =
        document.getElementById(
            "reportStartDate"
        );

    const end =
        document.getElementById(
            "reportEndDate"
        );


    if (start) {

        start.addEventListener(
            "change",
            function () {

                if (
                    document.getElementById(
                        "reportPeriod"
                    ).value === "custom"
                ) {

                    loadReports();

                }

            }
        );

    }


    if (end) {

        end.addEventListener(
            "change",
            function () {

                if (
                    document.getElementById(
                        "reportPeriod"
                    ).value === "custom"
                ) {

                    loadReports();

                }

            }
        );

    }

}


// =====================================================
// LOAD ALL REPORT DATA
// =====================================================

async function loadReports() {

    showReportNotification(
        "Loading report data...",
        ""
    );


    try {

        await Promise.all([
            loadTicketsReport(),
            loadStaffReport(),
            loadAssetsReport(),
            loadMaintenanceReport(),
            loadDeviceChangesReport()
        ]);


        updateReportCards();

        updateAssetTypeReport();

        updateBranchReport();

        updateReportInformation();


        hideReportNotification();

    } catch (error) {

        console.error(
            "Reports loading error:",
            error
        );

        showReportNotification(
            "Some report information could not be loaded.",
            "error"
        );

    }

}


// =====================================================
// DATE FILTER
// =====================================================

function getReportDateRange() {

    const period =
        document.getElementById(
            "reportPeriod"
        )?.value || "month";


    const now = new Date();


    let start = null;
    let end = new Date(now);


    if (period === "today") {

        start = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate()
        );

    }


    else if (period === "week") {

        const day = now.getDay();

        const difference =
            day === 0
                ? 6
                : day - 1;


        start = new Date(now);

        start.setDate(
            now.getDate() - difference
        );

        start.setHours(
            0,
            0,
            0,
            0
        );

    }


    else if (period === "month") {

        start = new Date(
            now.getFullYear(),
            now.getMonth(),
            1
        );

    }


    else if (period === "year") {

        start = new Date(
            now.getFullYear(),
            0,
            1
        );

    }


    else if (period === "custom") {

        const startValue =
            document.getElementById(
                "reportStartDate"
            )?.value;

        const endValue =
            document.getElementById(
                "reportEndDate"
            )?.value;


        if (startValue) {

            start = new Date(
                startValue + "T00:00:00"
            );

        }


        if (endValue) {

            end = new Date(
                endValue + "T23:59:59"
            );

        }

    }


    return {
        start,
        end
    };

}


// =====================================================
// CHECK DATE
// =====================================================

function isDateInReportRange(
    value
) {

    if (!value) {

        return true;

    }


    const range =
        getReportDateRange();


    if (!range.start) {

        return true;

    }


    const date =
        new Date(value);


    return (
        date >= range.start &&
        date <= range.end
    );

}


// =====================================================
// LOAD TICKETS
// =====================================================

async function loadTicketsReport() {

    const {
        data,
        error
    } = await supabaseClient
        .from("tickets")
        .select("*");


    if (error) {

        console.error(
            "Tickets report error:",
            error
        );

        reportTickets = [];

        return;

    }


    reportTickets =
        (data || []).filter(
            ticket => {

                return isDateInReportRange(
                    ticket.created_at ||
                    ticket.created_date
                );

            }
        );

}


// =====================================================
// LOAD STAFF
// =====================================================

async function loadStaffReport() {

    const {
        data,
        error
    } = await supabaseClient
        .from("staff_directory")
        .select("*");


    if (error) {

        console.error(
            "Staff report error:",
            error
        );

        reportStaff = [];

        return;

    }


    reportStaff = data || [];

}


// =====================================================
// LOAD ASSETS
// =====================================================

async function loadAssetsReport() {

    const {
        data,
        error
    } = await supabaseClient
        .from("assets")
        .select("*");


    if (error) {

        console.error(
            "Assets report error:",
            error
        );

        reportAssets = [];

        return;

    }


    reportAssets = data || [];

}


// =====================================================
// LOAD MAINTENANCE
// =====================================================

async function loadMaintenanceReport() {

    const {
        data,
        error
    } = await supabaseClient
        .from("maintenance")
        .select("*");


    if (error) {

        console.error(
            "Maintenance report error:",
            error
        );

        reportMaintenance = [];

        return;

    }


    reportMaintenance =
        (data || []).filter(
            item => {

                return isDateInReportRange(
                    item.created_at ||
                    item.maintenance_date
                );

            }
        );

}


// =====================================================
// LOAD DEVICE CHANGES
// =====================================================

async function loadDeviceChangesReport() {

    const {
        data,
        error
    } = await supabaseClient
        .from("staff_device_changes")
        .select("*");


    if (error) {

        console.error(
            "Device changes report error:",
            error
        );

        reportDeviceChanges = [];

        return;

    }


    reportDeviceChanges =
        (data || []).filter(
            item => {

                return isDateInReportRange(
                    item.change_date ||
                    item.created_at
                );

            }
        );

}


// =====================================================
// UPDATE REPORT CARDS
// =====================================================

function updateReportCards() {

    // -------------------------------------------------
    // TICKETS
    // -------------------------------------------------

    const totalTickets =
        reportTickets.length;


    const treatedTickets =
        reportTickets.filter(
            ticket => {

                const status =
                    String(
                        ticket.status || ""
                    ).toLowerCase();


                return (
                    status === "resolved" ||
                    status === "closed" ||
                    status === "treated" ||
                    status === "completed"
                );

            }
        ).length;


    const openTickets =
        reportTickets.filter(
            ticket => {

                const status =
                    String(
                        ticket.status || ""
                    ).toLowerCase();


                return (
                    status === "open" ||
                    status === "in progress"
                );

            }
        ).length;


    const pendingTickets =
        reportTickets.filter(
            ticket => {

                const status =
                    String(
                        ticket.status || ""
                    ).toLowerCase();


                const approval =
                    String(
                        ticket.approval_status || ""
                    ).toLowerCase();


                return (
                    status === "pending approval" ||
                    approval === "pending"
                );

            }
        ).length;


    const rejectedTickets =
        reportTickets.filter(
            ticket => {

                const status =
                    String(
                        ticket.status || ""
                    ).toLowerCase();


                const approval =
                    String(
                        ticket.approval_status || ""
                    ).toLowerCase();


                return (
                    status === "rejected" ||
                    approval === "rejected"
                );

            }
        ).length;


    const highPriorityTickets =
        reportTickets.filter(
            ticket => {

                return String(
                    ticket.priority || ""
                ).toLowerCase() === "high";

            }
        ).length;


    setText(
        "reportTotalTickets",
        totalTickets
    );

    setText(
        "reportTreatedTickets",
        treatedTickets
    );

    setText(
        "reportOpenTickets",
        openTickets
    );

    setText(
        "reportPendingTickets",
        pendingTickets
    );

    setText(
        "reportRejectedTickets",
        rejectedTickets
    );

    setText(
        "reportHighPriorityTickets",
        highPriorityTickets
    );


    // -------------------------------------------------
    // STAFF
    // -------------------------------------------------

    const activeStaff =
        reportStaff.filter(
            staff =>
                String(
                    staff.staff_status || ""
                ).toLowerCase() === "active"
        ).length;


    const resignedStaff =
        reportStaff.filter(
            staff =>
                String(
                    staff.staff_status || ""
                ).toLowerCase() === "resigned"
        ).length;


    setText(
        "reportActiveStaff",
        activeStaff
    );

    setText(
        "reportStaffTotal",
        reportStaff.length
    );

    setText(
        "reportStaffActive",
        activeStaff
    );

    setText(
        "reportStaffResigned",
        resignedStaff
    );

    setText(
        "reportDeviceChanges",
        reportDeviceChanges.length
    );


    // -------------------------------------------------
    // ASSETS
    // -------------------------------------------------

    const totalAssets =
        reportAssets.length;


    const goodAssets =
        reportAssets.filter(
            asset =>
                String(
                    asset.condition || ""
                ).toLowerCase() === "good"
        ).length;


    const faultyAssets =
        reportAssets.filter(
            asset =>
                String(
                    asset.condition || ""
                ).toLowerCase() === "faulty"
        ).length;


    const usedAssets =
        reportAssets.filter(
            asset =>
                String(
                    asset.status || ""
                ).toLowerCase() === "in use"
        ).length;


    setText(
        "reportTotalAssets",
        totalAssets
    );

    setText(
        "reportAssetsTotal",
        totalAssets
    );

    setText(
        "reportAssetsGood",
        goodAssets
    );

    setText(
        "reportAssetsFaulty",
        faultyAssets
    );

    setText(
        "reportAssetsUsed",
        usedAssets
    );


    // -------------------------------------------------
    // MAINTENANCE
    // -------------------------------------------------

    const maintenanceTotal =
        reportMaintenance.length;


    const maintenancePending =
        reportMaintenance.filter(
            item =>
                String(
                    item.status || ""
                ).toLowerCase() === "pending"
        ).length;


    const maintenanceProgress =
        reportMaintenance.filter(
            item =>
                String(
                    item.status || ""
                ).toLowerCase() ===
                "in progress"
        ).length;


    const maintenanceCompleted =
        reportMaintenance.filter(
            item =>
                String(
                    item.status || ""
                ).toLowerCase() ===
                "completed"
        ).length;


    setText(
        "reportMaintenanceTotal",
        maintenanceTotal
    );

    setText(
        "reportMaintenancePending",
        maintenancePending
    );

    setText(
        "reportMaintenanceProgress",
        maintenanceProgress
    );

    setText(
        "reportMaintenanceCompleted",
        maintenanceCompleted
    );

}


// =====================================================
// ASSET TYPE REPORT
// =====================================================

function updateAssetTypeReport() {

    const body =
        document.getElementById(
            "assetReportBody"
        );


    if (!body) {

        return;

    }


    const groups = {};


    reportAssets.forEach(
        asset => {

            const type =
                asset.asset_type ||
                "Other";


            if (!groups[type]) {

                groups[type] = {
                    total: 0,
                    good: 0,
                    faulty: 0,
                    used: 0
                };

            }


            groups[type].total++;


            if (
                String(
                    asset.condition || ""
                ).toLowerCase() === "good"
            ) {

                groups[type].good++;

            }


            if (
                String(
                    asset.condition || ""
                ).toLowerCase() === "faulty"
            ) {

                groups[type].faulty++;

            }


            if (
                String(
                    asset.status || ""
                ).toLowerCase() === "in use"
            ) {

                groups[type].used++;

            }

        }
    );


    const types =
        Object.keys(groups).sort();


    if (!types.length) {

        body.innerHTML = `
            <tr>
                <td colspan="5" class="empty-report">
                    No asset data available.
                </td>
            </tr>
        `;

        return;

    }


    body.innerHTML =
        types.map(
            type => {

                const group =
                    groups[type];


                return `
                    <tr>

                        <td>
                            ${escapeHTML(type)}
                        </td>

                        <td>
                            ${group.total}
                        </td>

                        <td>
                            ${group.good}
                        </td>

                        <td>
                            ${group.faulty}
                        </td>

                        <td>
                            ${group.used}
                        </td>

                    </tr>
                `;

            }
        ).join("");

}


// =====================================================
// BRANCH REPORT
// =====================================================

function updateBranchReport() {

    const body =
        document.getElementById(
            "branchReportBody"
        );


    if (!body) {

        return;

    }


    const branches = {};


    reportAssets.forEach(
        asset => {

            const branch =
                asset.branch ||
                "Unassigned";


            if (!branches[branch]) {

                branches[branch] = {
                    total: 0,
                    good: 0,
                    faulty: 0,
                    used: 0,
                    available: 0
                };

            }


            branches[branch].total++;


            const condition =
                String(
                    asset.condition || ""
                ).toLowerCase();


            const status =
                String(
                    asset.status || ""
                ).toLowerCase();


            if (condition === "good") {

                branches[branch].good++;

            }


            if (condition === "faulty") {

                branches[branch].faulty++;

            }


            if (status === "in use") {

                branches[branch].used++;

            }


            if (
                status === "available" ||
                status === "unused"
            ) {

                branches[branch].available++;

            }

        }
    );


    const branchNames =
        Object.keys(branches).sort();


    if (!branchNames.length) {

        body.innerHTML = `
            <tr>
                <td colspan="6" class="empty-report">
                    No branch data available.
                </td>
            </tr>
        `;

        return;

    }


    body.innerHTML =
        branchNames.map(
            branch => {

                const item =
                    branches[branch];


                return `
                    <tr>

                        <td>
                            ${escapeHTML(branch)}
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
                            ${item.used}
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
// REPORT INFORMATION
// =====================================================

function updateReportInformation() {

    const now =
        new Date();


    setText(
        "reportGeneratedDate",
        now.toLocaleString()
    );


    const periodText =
        getReportPeriodText();


    setText(
        "reportPeriodText",
        periodText
    );

    setText(
        "printReportPeriod",
        periodText
    );

}


// =====================================================
// PERIOD TEXT
// =====================================================

function getReportPeriodText() {

    const period =
        document.getElementById(
            "reportPeriod"
        )?.value || "month";


    if (period === "today") {

        return "Today";

    }


    if (period === "week") {

        return "This Week";

    }


    if (period === "month") {

        return "This Month";

    }


    if (period === "year") {

        return "This Year";

    }


    if (period === "all") {

        return "All Time";

    }


    if (period === "custom") {

        const start =
            document.getElementById(
                "reportStartDate"
            )?.value || "";


        const end =
            document.getElementById(
                "reportEndDate"
            )?.value || "";


        return (
            (start || "Start") +
            " to " +
            (end || "End")
        );

    }


    return "Selected Period";

}


// =====================================================
// EXPORT TO EXCEL
// =====================================================

function exportExcelReport() {

    try {

        const rows = [];


        // -------------------------------------------------
        // SUMMARY
        // -------------------------------------------------

        rows.push([
            "FLEETWOOD LENDING LIMITED"
        ]);

        rows.push([
            "IT SUPPORT MANAGEMENT REPORT"
        ]);

        rows.push([
            "Reporting Period",
            getReportPeriodText()
        ]);

        rows.push([]);


        rows.push([
            "SUMMARY"
        ]);

        rows.push([
            "Total Tickets",
            reportTickets.length
        ]);

        rows.push([
            "Tickets Treated",
            getTreatedTickets()
        ]);

        rows.push([
            "Open Tickets",
            getOpenTickets()
        ]);

        rows.push([
            "Pending Approval",
            getPendingTickets()
        ]);

        rows.push([
            "Rejected Tickets",
            getRejectedTickets()
        ]);

        rows.push([
            "High Priority Tickets",
            getHighPriorityTickets()
        ]);

        rows.push([
            "Total Staff",
            reportStaff.length
        ]);

        rows.push([
            "Active Staff",
            getActiveStaff()
        ]);

        rows.push([
            "Resigned Staff",
            getResignedStaff()
        ]);

        rows.push([
            "Total Assets",
            reportAssets.length
        ]);

        rows.push([
            "Good Assets",
            getGoodAssets()
        ]);

        rows.push([
            "Faulty Assets",
            getFaultyAssets()
        ]);

        rows.push([
            "Assets In Use",
            getUsedAssets()
        ]);

        rows.push([
            "Maintenance Records",
            reportMaintenance.length
        ]);

        rows.push([
            "Device Changes",
            reportDeviceChanges.length
        ]);

        rows.push([]);


        // -------------------------------------------------
        // ASSETS
        // -------------------------------------------------

        rows.push([
            "ASSET DETAILS"
        ]);

        rows.push([
            "Asset Type",
            "Asset Name",
            "Serial Number",
            "Asset Tag",
            "Branch",
            "Assigned To",
            "Condition",
            "Status"
        ]);


        reportAssets.forEach(
            asset => {

                rows.push([
                    asset.asset_type || "",
                    asset.asset_name || "",
                    asset.serial_number || "",
                    asset.asset_tag || "",
                    asset.branch || "",
                    asset.assigned_to || "",
                    asset.condition || "",
                    asset.status || ""
                ]);

            }
        );


        rows.push([]);


        // -------------------------------------------------
        // STAFF
        // -------------------------------------------------

        rows.push([
            "STAFF DIRECTORY"
        ]);

        rows.push([
            "Staff Name",
            "Department",
            "Phone",
            "Laptop",
            "Laptop Serial",
            "Asset Tag",
            "Other Gadgets",
            "Status"
        ]);


        reportStaff.forEach(
            staff => {

                rows.push([
                    staff.staff_name || "",
                    staff.department || "",
                    staff.phone_number || "",
                    staff.current_laptop || "",
                    staff.laptop_serial_number || "",
                    staff.laptop_asset_tag || "",
                    staff.other_gadgets || "",
                    staff.staff_status || ""
                ]);

            }
        );


        rows.push([]);


        // -------------------------------------------------
        // TICKETS
        // -------------------------------------------------

        rows.push([
            "TICKETS"
        ]);

        rows.push([
            "Ticket ID",
            "Title",
            "Category",
            "Priority",
            "Status",
            "Approval Status",
            "Created At"
        ]);


        reportTickets.forEach(
            ticket => {

                rows.push([
                    ticket.id || "",
                    ticket.title || ticket.subject || "",
                    ticket.category || "",
                    ticket.priority || "",
                    ticket.status || "",
                    ticket.approval_status || "",
                    ticket.created_at || ""
                ]);

            }
        );


        rows.push([]);


        // -------------------------------------------------
        // MAINTENANCE
        // -------------------------------------------------

        rows.push([
            "MAINTENANCE"
        ]);

        rows.push([
            "Asset ID",
            "Maintenance Type",
            "Priority",
            "Status",
            "Cost",
            "Date",
            "Description"
        ]);


        reportMaintenance.forEach(
            item => {

                rows.push([
                    item.asset_id || "",
                    item.maintenance_type || "",
                    item.priority || "",
                    item.status || "",
                    item.cost || "",
                    item.maintenance_date ||
                        item.created_at ||
                        "",
                    item.description ||
                        item.notes ||
                        ""
                ]);

            }
        );


        // -------------------------------------------------
        // CREATE CSV
        // -------------------------------------------------

        const csv =
            rows
                .map(
                    row =>
                        row
                            .map(
                                value =>
                                    `"${String(value ?? "")
                                        .replace(/"/g, '""')}"`
                            )
                            .join(",")
                )
                .join("\n");


        const blob =
            new Blob(
                [csv],
                {
                    type:
                        "text/csv;charset=utf-8;"
                }
            );


        const url =
            URL.createObjectURL(blob);


        const link =
            document.createElement("a");


        link.href = url;

        link.download =
            "Fleetwood_IT_Support_Report_" +
            getFileDate() +
            ".csv";


        document.body.appendChild(link);

        link.click();

        document.body.removeChild(link);

        URL.revokeObjectURL(url);


        showReportNotification(
            "Excel-compatible report downloaded successfully.",
            "success"
        );

    } catch (error) {

        console.error(
            "Excel export error:",
            error
        );

        showReportNotification(
            "Unable to export Excel report.",
            "error"
        );

    }

}


// =====================================================
// EXPORT TO WORD
// =====================================================

function exportWordReport() {

    try {

        const html =
            buildWordReport();


        const blob =
            new Blob(
                [
                    "\ufeff",
                    html
                ],
                {
                    type:
                        "application/msword"
                }
            );


        const url =
            URL.createObjectURL(blob);


        const link =
            document.createElement("a");


        link.href = url;

        link.download =
            "Fleetwood_IT_Support_Report_" +
            getFileDate() +
            ".doc";


        document.body.appendChild(link);

        link.click();

        document.body.removeChild(link);

        URL.revokeObjectURL(url);


        showReportNotification(
            "Word report downloaded successfully.",
            "success"
        );

    } catch (error) {

        console.error(
            "Word export error:",
            error
        );

        showReportNotification(
            "Unable to export Word report.",
            "error"
        );

    }

}


// =====================================================
// BUILD WORD REPORT
// =====================================================

function buildWordReport() {

    const rows =
        reportAssets.map(
            asset => {

                return `
                    <tr>
                        <td>${escapeHTML(asset.asset_type || "")}</td>
                        <td>${escapeHTML(asset.asset_name || "")}</td>
                        <td>${escapeHTML(asset.serial_number || "")}</td>
                        <td>${escapeHTML(asset.branch || "")}</td>
                        <td>${escapeHTML(asset.condition || "")}</td>
                        <td>${escapeHTML(asset.status || "")}</td>
                    </tr>
                `;

            }
        ).join("");


    return `
<!DOCTYPE html>

<html>

<head>

<meta charset="UTF-8">

<title>Fleetwood IT Support Report</title>

<style>

body {
    font-family: Arial, Helvetica, sans-serif;
    color: #172033;
    margin: 40px;
}

h1 {
    text-align: center;
    margin-bottom: 5px;
}

h2 {
    text-align: center;
    margin-top: 0;
}

h3 {
    margin-top: 30px;
    border-bottom: 1px solid #ccc;
    padding-bottom: 8px;
}

.period {
    text-align: center;
    margin-bottom: 30px;
}

table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 15px;
}

th,
td {
    border: 1px solid #ccc;
    padding: 8px;
    text-align: left;
    font-size: 12px;
}

th {
    background: #f1f5f9;
}

.summary-table td:first-child {
    font-weight: bold;
    width: 65%;
}

.footer {
    margin-top: 40px;
    font-size: 11px;
    color: #64748b;
}

</style>

</head>

<body>

<h1>FLEETWOOD LENDING LIMITED</h1>

<h2>IT SUPPORT MANAGEMENT REPORT</h2>

<div class="period">
    Reporting Period:
    ${escapeHTML(getReportPeriodText())}
</div>


<h3>Executive Summary</h3>

<table class="summary-table">

<tr>
    <td>Total Tickets</td>
    <td>${reportTickets.length}</td>
</tr>

<tr>
    <td>Tickets Treated</td>
    <td>${getTreatedTickets()}</td>
</tr>

<tr>
    <td>Open Tickets</td>
    <td>${getOpenTickets()}</td>
</tr>

<tr>
    <td>Pending Approval</td>
    <td>${getPendingTickets()}</td>
</tr>

<tr>
    <td>Rejected Tickets</td>
    <td>${getRejectedTickets()}</td>
</tr>

<tr>
    <td>High Priority Tickets</td>
    <td>${getHighPriorityTickets()}</td>
</tr>

<tr>
    <td>Total Staff</td>
    <td>${reportStaff.length}</td>
</tr>

<tr>
    <td>Active Staff</td>
    <td>${getActiveStaff()}</td>
</tr>

<tr>
    <td>Resigned Staff</td>
    <td>${getResignedStaff()}</td>
</tr>

<tr>
    <td>Total IT Assets</td>
    <td>${reportAssets.length}</td>
</tr>

<tr>
    <td>Good Assets</td>
    <td>${getGoodAssets()}</td>
</tr>

<tr>
    <td>Faulty Assets</td>
    <td>${getFaultyAssets()}</td>
</tr>

<tr>
    <td>Assets In Use</td>
    <td>${getUsedAssets()}</td>
</tr>

<tr>
    <td>Maintenance Records</td>
    <td>${reportMaintenance.length}</td>
</tr>

<tr>
    <td>Device Changes</td>
    <td>${reportDeviceChanges.length}</td>
</tr>

</table>


<h3>IT Asset Details</h3>

<table>

<thead>

<tr>
    <th>Asset Type</th>
    <th>Asset Name</th>
    <th>Serial Number</th>
    <th>Branch</th>
    <th>Condition</th>
    <th>Status</th>
</tr>

</thead>

<tbody>

${rows || `
<tr>
    <td colspan="6">
        No asset records available.
    </td>
</tr>
`}

</tbody>

</table>


<h3>Staff Summary</h3>

<table>

<tr>
    <th>Staff Category</th>
    <th>Total</th>
</tr>

<tr>
    <td>Total Staff</td>
    <td>${reportStaff.length}</td>
</tr>

<tr>
    <td>Active Staff</td>
    <td>${getActiveStaff()}</td>
</tr>

<tr>
    <td>Resigned Staff</td>
    <td>${getResignedStaff()}</td>
</tr>

<tr>
    <td>Device Changes</td>
    <td>${reportDeviceChanges.length}</td>
</tr>

</table>


<div class="footer">

Generated by Fleetwood IT Support Management System<br>

Generated:
${new Date().toLocaleString()}

</div>

</body>

</html>
`;

}


// =====================================================
// HELPER COUNTERS
// =====================================================

function getTreatedTickets() {

    return reportTickets.filter(
        ticket => {

            const status =
                String(
                    ticket.status || ""
                ).toLowerCase();


            return (
                status === "resolved" ||
                status === "closed" ||
                status === "treated" ||
                status === "completed"
            );

        }
    ).length;

}


function getOpenTickets() {

    return reportTickets.filter(
        ticket => {

            const status =
                String(
                    ticket.status || ""
                ).toLowerCase();


            return (
                status === "open" ||
                status === "in progress"
            );

        }
    ).length;

}


function getPendingTickets() {

    return reportTickets.filter(
        ticket => {

            const status =
                String(
                    ticket.status || ""
                ).toLowerCase();


            const approval =
                String(
                    ticket.approval_status || ""
                ).toLowerCase();


            return (
                status === "pending approval" ||
                approval === "pending"
            );

        }
    ).length;

}


function getRejectedTickets() {

    return reportTickets.filter(
        ticket => {

            const status =
                String(
                    ticket.status || ""
                ).toLowerCase();


            const approval =
                String(
                    ticket.approval_status || ""
                ).toLowerCase();


            return (
                status === "rejected" ||
                approval === "rejected"
            );

        }
    ).length;

}


function getHighPriorityTickets() {

    return reportTickets.filter(
        ticket =>
            String(
                ticket.priority || ""
            ).toLowerCase() === "high"
    ).length;

}


function getActiveStaff() {

    return reportStaff.filter(
        staff =>
            String(
                staff.staff_status || ""
            ).toLowerCase() === "active"
    ).length;

}


function getResignedStaff() {

    return reportStaff.filter(
        staff =>
            String(
                staff.staff_status || ""
            ).toLowerCase() === "resigned"
    ).length;

}


function getGoodAssets() {

    return reportAssets.filter(
        asset =>
            String(
                asset.condition || ""
            ).toLowerCase() === "good"
    ).length;

}


function getFaultyAssets() {

    return reportAssets.filter(
        asset =>
            String(
                asset.condition || ""
            ).toLowerCase() === "faulty"
    ).length;

}


function getUsedAssets() {

    return reportAssets.filter(
        asset =>
            String(
                asset.status || ""
            ).toLowerCase() === "in use"
    ).length;

}


// =====================================================
// PRINT REPORT
// =====================================================

function printReport() {

    window.print();

}


// =====================================================
// LOGOUT
// =====================================================

async function logoutReports() {

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


    localStorage.removeItem("userRole");
    localStorage.removeItem("userName");
    localStorage.removeItem("userEmail");
    localStorage.removeItem("userId");


    window.location.href =
        "index.html";

}


// =====================================================
// NOTIFICATION
// =====================================================

function showReportNotification(
    message,
    type
) {

    const box =
        document.getElementById(
            "reportNotification"
        );


    if (!box) {

        return;

    }


    box.textContent =
        message;


    box.className =
        "report-notification";


    if (type === "success") {

        box.classList.add(
            "success"
        );

    }


    if (type === "error") {

        box.classList.add(
            "error"
        );

    }


    box.style.display =
        "block";


    if (type !== "") {

        setTimeout(
            function () {

                hideReportNotification();

            },
            3500
        );

    }

}


function hideReportNotification() {

    const box =
        document.getElementById(
            "reportNotification"
        );


    if (box) {

        box.style.display =
            "none";

    }

}


// =====================================================
// DOM HELPERS
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


function escapeHTML(value) {

    return String(
        value ?? ""
    )
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
// FILE DATE
// =====================================================

function getFileDate() {

    const date =
        new Date();


    return date
        .toISOString()
        .slice(0, 10);

}


// =====================================================
// AUTO REFRESH
// =====================================================

setInterval(
    function () {

        if (
            document.visibilityState ===
            "visible"
        ) {

            loadReports();

        }

    },
    60000
);


// =====================================================
// GLOBAL FUNCTIONS
// =====================================================

window.loadReports =
    loadReports;

window.exportWordReport =
    exportWordReport;

window.exportExcelReport =
    exportExcelReport;

window.printReport =
    printReport;

window.logoutReports =
    logoutReports;


console.log(
    "reports.js loaded successfully."
);