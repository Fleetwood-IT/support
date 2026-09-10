// =====================================================
// FLEETWOOD IT SUPPORT CENTER
// MANAGER DASHBOARD JAVASCRIPT
// =====================================================


// =====================================================
// SUPABASE CONFIGURATION
// =====================================================

const SUPABASE_URL =
    "https://xcfobyusisjbfbnsohjz.supabase.co";

const SUPABASE_ANON_KEY =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhjZm9ieXVzaXNqYmZibnNvaGp6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg3ODc5NzEsImV4cCI6MjEwNDM2Mzk3MX0.ATSzb3RKqGDNPEL_YdORwBzsQJPMIqONzJJaG7LW9YU";

const supabaseClient =
    supabase.createClient(
        SUPABASE_URL,
        SUPABASE_ANON_KEY
    );


// =====================================================
// GLOBAL VARIABLES
// =====================================================

let currentUser = null;
let currentProfile = null;
let selectedTicket = null;

let allTickets = [];
let allAssets = [];
let allSuggestions = [];


// =====================================================
// DOM ELEMENTS
// =====================================================

const approvalRequestsBody =
    document.getElementById("approvalRequestsBody");

const approvalHistoryBody =
    document.getElementById("approvalHistoryBody");

const managerComplaintsBody =
    document.getElementById("managerComplaintsBody");

const managerAssetsBody =
    document.getElementById("managerAssetsBody");

const suggestionsGrid =
    document.getElementById("suggestionsGrid");

const approvalModal =
    document.getElementById("approvalModal");

const closeApprovalModal =
    document.getElementById("closeApprovalModal");

const approveRequest =
    document.getElementById("approveRequest");

const declineRequest =
    document.getElementById("declineRequest");

const approvalComment =
    document.getElementById("approvalComment");

const logoutBtn =
    document.getElementById("logoutBtn");

const reportPeriod =
    document.getElementById("reportPeriod");

const topbarGreeting =
    document.getElementById("topbarGreeting");

const sidebarRoleLabel =
    document.getElementById("sidebarRoleLabel");


// =====================================================
// GREETING (based on time of day)
// =====================================================

function applyGreeting() {

    if (!topbarGreeting) {
        return;
    }

    const hour =
        new Date().getHours();

    let greeting =
        "Good evening";

    if (hour < 12) {

        greeting =
            "Good morning";

    } else if (hour < 18) {

        greeting =
            "Good afternoon";

    }

    topbarGreeting.textContent =
        greeting;

}

applyGreeting();


// =====================================================
// START DASHBOARD
// =====================================================

document.addEventListener(
    "DOMContentLoaded",
    async function () {

        try {

            await checkManagerAccess();

        } catch (error) {

            console.error(
                "Dashboard startup error:",
                error
            );

            alert(
                "Unable to load the Manager Dashboard.\n\n" +
                error.message
            );

        }

    }
);


// =====================================================
// CHECK MANAGER ACCESS
// =====================================================

async function checkManagerAccess() {

    const {
        data: {
            session
        },
        error
    } =
        await supabaseClient.auth.getSession();


    if (error) {

        console.error(
            "Session error:",
            error
        );

        window.location.href =
            "index.html";

        return;
    }


    if (!session) {

        window.location.href =
            "index.html";

        return;
    }


    currentUser =
        session.user;


    // =================================================
    // LOAD USER PROFILE
    // =================================================

    const {
        data: profile,
        error: profileError
    } =
        await supabaseClient
            .from("user_profiles")
            .select("*")
            .eq(
                "id",
                currentUser.id
            )
            .single();


    if (profileError) {

        console.error(
            "Profile error:",
            profileError
        );

        alert(
            "Your user profile could not be found."
        );

        window.location.href =
            "index.html";

        return;
    }


    currentProfile =
        profile;


    // =================================================
    // CHECK MANAGER / ADMIN ROLE
    // =================================================

    const role =
        String(
            profile.role || ""
        )
        .trim()
        .toLowerCase();


    if (
        role !== "manager" &&
        role !== "admin"
    ) {

        alert(
            "Access denied. Only Managers and Administrators can access this dashboard."
        );

        window.location.href =
            "index.html";

        return;
    }


    if (sidebarRoleLabel) {

        const displayName =
            profile.full_name ||
            profile.name ||
            (
                role.charAt(0).toUpperCase() +
                role.slice(1)
            );

        sidebarRoleLabel.textContent =
            displayName;

    }


    // =================================================
    // LOAD DASHBOARD
    // =================================================

    await loadDashboard();

}


// =====================================================
// LOAD DASHBOARD
// =====================================================

async function loadDashboard() {

    await loadTickets();

    await loadAssets();

    await loadSuggestions();

    updateSummaryCards();

    renderApprovalRequests();

    renderApprovalHistory();

    renderComplaints();

    renderDepartments();

    renderAssets();

    renderSuggestions();

}


// =====================================================
// LOAD TICKETS
// =====================================================

async function loadTickets() {

    const {
        data,
        error
    } =
        await supabaseClient
            .from("tickets")
            .select("*")
            .order(
                "created_at",
                {
                    ascending: false
                }
            );


    if (error) {

        console.error(
            "Ticket loading error:",
            error
        );

        allTickets = [];

        return;
    }


    allTickets =
        data || [];

}


// =====================================================
// LOAD ASSETS
// =====================================================

async function loadAssets() {

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

        console.warn(
            "Assets could not be loaded:",
            error.message
        );

        allAssets = [];

        return;
    }


    allAssets =
        data || [];

}


// =====================================================
// LOAD SUGGESTIONS
// =====================================================

async function loadSuggestions() {

    const {
        data,
        error
    } =
        await supabaseClient
            .from("suggestions")
            .select("*")
            .order(
                "created_at",
                {
                    ascending: false
                }
            );


    if (error) {

        console.warn(
            "Suggestions could not be loaded:",
            error.message
        );

        allSuggestions = [];

        return;
    }


    allSuggestions =
        data || [];

}


// =====================================================
// SUMMARY CARDS
// =====================================================

function updateSummaryCards() {

    const total =
        allTickets.length;


    const resolved =
        allTickets.filter(
            function (ticket) {

                const status =
                    String(
                        ticket.status || ""
                    )
                    .trim()
                    .toLowerCase();


                return (
                    status === "resolved" ||
                    status === "closed" ||
                    status === "completed"
                );

            }
        ).length;


    const pending =
        allTickets.filter(
            function (ticket) {

                const status =
                    String(
                        ticket.status || ""
                    )
                    .trim()
                    .toLowerCase();


                return (
                    status === "pending" ||
                    status === "open" ||
                    status === "in progress" ||
                    status === "pending approval"
                );

            }
        ).length;


    const complainants =
        new Set(
            allTickets
                .map(
                    function (ticket) {

                        return ticket.requester_name;

                    }
                )
                .filter(Boolean)
        ).size;


    setText(
        "managerTotalTickets",
        total
    );

    setText(
        "managerResolved",
        resolved
    );

    setText(
        "managerPending",
        pending
    );

    setText(
        "managerComplainants",
        complainants
    );

}


// =====================================================
// RENDER PENDING APPROVAL REQUESTS
// =====================================================

function renderApprovalRequests() {

    if (!approvalRequestsBody) {
        return;
    }


    const pendingApprovals =
        allTickets.filter(
            function (ticket) {

                const approvalStatus =
                    String(
                        ticket.approval_status || ""
                    )
                    .trim()
                    .toLowerCase();


                const createdByRole =
                    String(
                        ticket.created_by_role || ""
                    )
                    .trim()
                    .toLowerCase();


                return (
                    createdByRole === "it" &&
                    approvalStatus === "pending"
                );

            }
        );


    if (
        pendingApprovals.length === 0
    ) {

        approvalRequestsBody.innerHTML = `
            <tr>
                <td colspan="6" class="no-data">
                    No requests awaiting approval.
                </td>
            </tr>
        `;

        return;
    }


    approvalRequestsBody.innerHTML =
        pendingApprovals
            .map(
                function (ticket) {

                    const priority =
                        String(
                            ticket.priority ||
                            "Normal"
                        )
                        .trim();


                    return `
                        <tr>

                            <td>

                                <div class="approval-request">

                                    <strong>
                                        ${escapeHTML(
                                            ticket.subject ||
                                            "IT Request"
                                        )}
                                    </strong>

                                    <small>
                                        ${formatTicketId(
                                            ticket.id
                                        )}
                                    </small>

                                </div>

                            </td>


                            <td>
                                ${escapeHTML(
                                    ticket.requester_name ||
                                    "-"
                                )}
                            </td>


                            <td>
                                ${escapeHTML(
                                    ticket.department ||
                                    "-"
                                )}
                            </td>


                            <td>

                                <span class="manager-status open">
                                    ${escapeHTML(
                                        priority
                                    )}
                                </span>

                            </td>


                            <td>
                                ${formatDate(
                                    ticket.created_at
                                )}
                            </td>


                            <td>

                                <button
                                    type="button"
                                    class="btn-primary"
                                    onclick="openApprovalModal('${ticket.id}')"
                                >
                                    Review
                                </button>

                            </td>

                        </tr>
                    `;

                }
            )
            .join("");

}


// =====================================================
// APPROVAL HISTORY
// =====================================================

function renderApprovalHistory() {

    if (!approvalHistoryBody) {
        return;
    }


    const history =
        allTickets.filter(
            function (ticket) {

                const approvalStatus =
                    String(
                        ticket.approval_status || ""
                    )
                    .trim()
                    .toLowerCase();


                const createdByRole =
                    String(
                        ticket.created_by_role || ""
                    )
                    .trim()
                    .toLowerCase();


                return (
                    createdByRole === "it" &&
                    (
                        approvalStatus === "approved" ||
                        approvalStatus === "rejected" ||
                        approvalStatus === "declined"
                    )
                );

            }
        );


    if (
        history.length === 0
    ) {

        approvalHistoryBody.innerHTML = `
            <tr>
                <td colspan="6" class="no-data">
                    No approval history yet.
                </td>
            </tr>
        `;

        return;
    }


    approvalHistoryBody.innerHTML =
        history
            .map(
                function (ticket) {

                    const approvalStatus =
                        String(
                            ticket.approval_status || ""
                        )
                        .trim()
                        .toLowerCase();


                    let decision =
                        "Unknown";


                    let decisionClass =
                        "open";


                    if (
                        approvalStatus ===
                        "approved"
                    ) {

                        decision =
                            "✓ Approved";

                        decisionClass =
                            "resolved";

                    }


                    if (
                        approvalStatus ===
                        "rejected" ||
                        approvalStatus ===
                        "declined"
                    ) {

                        decision =
                            "✕ Rejected";

                        decisionClass =
                            "rejected";

                    }


                    return `
                        <tr>

                            <td>

                                <div class="approval-request">

                                    <strong>
                                        ${escapeHTML(
                                            ticket.subject ||
                                            "Request"
                                        )}
                                    </strong>

                                    <small>
                                        ${formatTicketId(
                                            ticket.id
                                        )}
                                    </small>

                                </div>

                            </td>


                            <td>
                                ${escapeHTML(
                                    ticket.requester_name ||
                                    "-"
                                )}
                            </td>


                            <td>
                                ${escapeHTML(
                                    ticket.department ||
                                    "-"
                                )}
                            </td>


                            <td>

                                <span
                                    class="manager-status ${decisionClass}"
                                >
                                    ${decision}
                                </span>

                            </td>


                            <td>

                                <span
                                    class="approval-history-comment"
                                >
                                    ${escapeHTML(
                                        ticket.manager_comment ||
                                        "No comment recorded."
                                    )}
                                </span>

                            </td>


                            <td>
                                ${formatApprovalDate(
                                    ticket
                                )}
                            </td>

                        </tr>
                    `;

                }
            )
            .join("");

}


// =====================================================
// OPEN APPROVAL MODAL
// =====================================================

window.openApprovalModal =
    function (ticketId) {

        const ticket =
            allTickets.find(
                function (item) {

                    return (
                        String(item.id) ===
                        String(ticketId)
                    );

                }
            );


        if (!ticket) {

            alert(
                "The selected ticket could not be found."
            );

            return;
        }


        selectedTicket =
            ticket;


        setText(
            "approvalSubject",
            ticket.subject || "-"
        );


        setText(
            "approvalTicketNumber",
            formatTicketId(
                ticket.id
            )
        );


        setText(
            "approvalStaff",
            ticket.requester_name || "-"
        );


        setText(
            "approvalDepartment",
            ticket.department || "-"
        );


        setText(
            "approvalRequestType",
            ticket.category || "-"
        );


        setText(
            "approvalPriority",
            ticket.priority || "-"
        );


        setText(
            "approvalDate",
            formatDate(
                ticket.created_at
            )
        );


        setText(
            "approvalDescription",
            ticket.description ||
            "No description provided."
        );


        if (approvalComment) {

            approvalComment.value = "";

        }


        if (approvalModal) {

            approvalModal.style.display =
                "flex";

        }

};


// =====================================================
// CLOSE MODAL
// =====================================================

function closeModal() {

    if (approvalModal) {

        approvalModal.style.display =
            "none";

    }


    selectedTicket =
        null;


    if (approvalComment) {

        approvalComment.value =
            "";

    }

}


if (closeApprovalModal) {

    closeApprovalModal.addEventListener(
        "click",
        closeModal
    );

}


// =====================================================
// CLOSE MODAL OUTSIDE
// =====================================================

if (approvalModal) {

    approvalModal.addEventListener(
        "click",
        function (event) {

            if (
                event.target ===
                approvalModal
            ) {

                closeModal();

            }

        }
    );

}


// =====================================================
// APPROVE REQUEST
// =====================================================

if (approveRequest) {

    approveRequest.addEventListener(
        "click",
        async function () {

            if (!selectedTicket) {

                alert(
                    "No ticket is selected."
                );

                return;
            }


            const comment =
                approvalComment
                    ? approvalComment.value.trim()
                    : "";


            if (!comment) {

                alert(
                    "Please enter a manager comment before approving this request."
                );

                if (approvalComment) {

                    approvalComment.focus();

                }

                return;
            }


            const confirmed =
                confirm(
                    "Are you sure you want to approve this IT request?"
                );


            if (!confirmed) {
                return;
            }


            setApprovalButtonsDisabled(
                true
            );


            try {

                const {
                    error
                } =
                    await supabaseClient
                        .from("tickets")
                        .update({

                            approval_status:
                                "approved",

                            manager_comment:
                                comment,

                            approved_by:
                                currentUser.id,

                            approved_at:
                                new Date()
                                    .toISOString(),

                            status:
                                "Open"

                        })
                        .eq(
                            "id",
                            selectedTicket.id
                        );


                if (error) {

                    throw error;

                }


                alert(
                    "Request approved successfully."
                );


                closeModal();


                await loadDashboard();


            } catch (error) {

                console.error(
                    "Approval error:",
                    error
                );


                alert(
                    "Failed to approve the request.\n\n" +
                    error.message
                );

            } finally {

                setApprovalButtonsDisabled(
                    false
                );

            }

        }
    );

}


// =====================================================
// REJECT REQUEST
// =====================================================

if (declineRequest) {

    declineRequest.addEventListener(
        "click",
        async function () {

            if (!selectedTicket) {

                alert(
                    "No ticket is selected."
                );

                return;
            }


            const comment =
                approvalComment
                    ? approvalComment.value.trim()
                    : "";


            if (!comment) {

                alert(
                    "Please enter a manager comment before rejecting this request."
                );

                if (approvalComment) {

                    approvalComment.focus();

                }

                return;
            }


            const confirmed =
                confirm(
                    "Are you sure you want to reject this IT request?"
                );


            if (!confirmed) {
                return;
            }


            setApprovalButtonsDisabled(
                true
            );


            try {

                const {
                    error
                } =
                    await supabaseClient
                        .from("tickets")
                        .update({

                            approval_status:
                                "rejected",

                            manager_comment:
                                comment,

                            rejected_by:
                                currentUser.id,

                            rejected_at:
                                new Date()
                                    .toISOString(),

                            status:
                                "Rejected"

                        })
                        .eq(
                            "id",
                            selectedTicket.id
                        );


                if (error) {

                    throw error;

                }


                alert(
                    "Request rejected successfully."
                );


                closeModal();


                await loadDashboard();


            } catch (error) {

                console.error(
                    "Rejection error:",
                    error
                );


                alert(
                    "Failed to reject the request.\n\n" +
                    error.message
                );

            } finally {

                setApprovalButtonsDisabled(
                    false
                );

            }

        }
    );

}


// =====================================================
// DISABLE APPROVAL BUTTONS
// =====================================================

function setApprovalButtonsDisabled(
    disabled
) {

    if (approveRequest) {

        approveRequest.disabled =
            disabled;

    }


    if (declineRequest) {

        declineRequest.disabled =
            disabled;

    }

}


// =====================================================
// RENDER COMPLAINTS
// =====================================================

function renderComplaints() {

    if (!managerComplaintsBody) {
        return;
    }


    const complaints =
        allTickets.filter(
            function (ticket) {

                const category =
                    String(
                        ticket.category || ""
                    )
                    .trim()
                    .toLowerCase();


                const subject =
                    String(
                        ticket.subject || ""
                    )
                    .trim()
                    .toLowerCase();


                return (
                    category.includes(
                        "complaint"
                    ) ||
                    subject.includes(
                        "complaint"
                    )
                );

            }
        );


    if (
        complaints.length === 0
    ) {

        managerComplaintsBody.innerHTML = `
            <tr>
                <td colspan="6" class="no-data">
                    No complaints found.
                </td>
            </tr>
        `;

        return;
    }


    managerComplaintsBody.innerHTML =
        complaints
            .map(
                function (ticket) {

                    const status =
                        ticket.status ||
                        "Open";


                    return `
                        <tr>

                            <td>
                                ${formatTicketId(
                                    ticket.id
                                )}
                            </td>

                            <td>
                                ${escapeHTML(
                                    ticket.requester_name ||
                                    "-"
                                )}
                            </td>

                            <td>
                                ${escapeHTML(
                                    ticket.department ||
                                    "-"
                                )}
                            </td>

                            <td>
                                ${escapeHTML(
                                    ticket.subject ||
                                    "-"
                                )}
                            </td>

                            <td>

                                <span
                                    class="manager-status ${getStatusClass(status)}"
                                >
                                    ${escapeHTML(
                                        status
                                    )}
                                </span>

                            </td>

                            <td>
                                ${formatDate(
                                    ticket.created_at
                                )}
                            </td>

                        </tr>
                    `;

                }
            )
            .join("");

}


// =====================================================
// RENDER DEPARTMENTS
// =====================================================

function renderDepartments() {

    const departments = {

        "Telemarketing":
            "countTelemarketing",

        "Customer Service":
            "countCustomerService",

        "QA":
            "countQA",

        "HR":
            "countHR",

        "IT":
            "countIT"

    };


    const counts = {};


    Object.keys(
        departments
    ).forEach(
        function (department) {

            counts[department] =
                0;

        }
    );


    allTickets.forEach(
        function (ticket) {

            const department =
                String(
                    ticket.department ||
                    ""
                )
                .trim();


            const matched =
                Object.keys(
                    departments
                ).find(
                    function (item) {

                        return (
                            item.toLowerCase() ===
                            department.toLowerCase()
                        );

                    }
                );


            if (matched) {

                counts[matched]++;

            }

        }
    );


    const total =
        allTickets.length ||
        1;


    Object.entries(
        departments
    ).forEach(
        function (
            [department, elementId]
        ) {

            setText(
                elementId,
                counts[department]
            );


            const fill =
                document.querySelector(
                    `.department-fill[data-department="${department}"]`
                );


            if (fill) {

                const percentage =
                    Math.round(
                        (
                            counts[department] /
                            total
                        ) * 100
                    );


                fill.style.width =
                    percentage + "%";

            }

        }
    );

}


// =====================================================
// RENDER ASSETS
// =====================================================

function renderAssets() {

    const total =
        allAssets.length;


    const good =
        allAssets.filter(
            function (asset) {

                const status =
                    String(
                        asset.status || ""
                    )
                    .trim()
                    .toLowerCase();


                return (
                    status === "good" ||
                    status === "working" ||
                    status === "active"
                );

            }
        ).length;


    const faulty =
        allAssets.filter(
            function (asset) {

                const status =
                    String(
                        asset.status || ""
                    )
                    .trim()
                    .toLowerCase();


                return (
                    status === "faulty" ||
                    status === "damaged" ||
                    status === "bad"
                );

            }
        ).length;


    const used =
        allAssets.filter(
            function (asset) {

                const status =
                    String(
                        asset.status || ""
                    )
                    .trim()
                    .toLowerCase();


                return (
                    status === "in use" ||
                    status === "assigned" ||
                    Boolean(
                        asset.assigned_to
                    )
                );

            }
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


    if (!managerAssetsBody) {
        return;
    }


    if (
        allAssets.length === 0
    ) {

        managerAssetsBody.innerHTML = `
            <tr>
                <td colspan="6" class="no-data">
                    No assets found.
                </td>
            </tr>
        `;

        return;
    }


    managerAssetsBody.innerHTML =
        allAssets
            .map(
                function (asset) {

                    const assetName =
                        asset.asset_name ||
                        asset.name ||
                        asset.asset ||
                        "-";


                    const category =
                        asset.category ||
                        asset.asset_type ||
                        "-";


                    const serial =
                        asset.serial_number ||
                        asset.serial ||
                        "-";


                    const department =
                        asset.department ||
                        "-";


                    const status =
                        asset.status ||
                        "-";


                    const assignedTo =
                        asset.assigned_to ||
                        asset.assigned_user ||
                        "-";


                    return `
                        <tr>

                            <td>
                                ${escapeHTML(
                                    assetName
                                )}
                            </td>

                            <td>
                                ${escapeHTML(
                                    category
                                )}
                            </td>

                            <td>
                                ${escapeHTML(
                                    serial
                                )}
                            </td>

                            <td>
                                ${escapeHTML(
                                    department
                                )}
                            </td>

                            <td>

                                <span
                                    class="manager-status ${getStatusClass(status)}"
                                >
                                    ${escapeHTML(
                                        status
                                    )}
                                </span>

                            </td>

                            <td>
                                ${escapeHTML(
                                    assignedTo
                                )}
                            </td>

                        </tr>
                    `;

                }
            )
            .join("");

}


// =====================================================
// RENDER SUGGESTIONS
// =====================================================

function renderSuggestions() {

    if (!suggestionsGrid) {
        return;
    }


    const normalizedStatus =
        function (suggestion) {

            const status =
                String(
                    suggestion.status || "new"
                )
                .trim()
                .toLowerCase();


            if (
                status === "reviewed"
            ) {

                return "reviewed";

            }


            if (
                status === "actioned" ||
                status === "resolved"
            ) {

                return "actioned";

            }


            if (
                status === "archived"
            ) {

                return "archived";

            }


            return "new";

        };


    const total =
        allSuggestions.length;


    const newCount =
        allSuggestions.filter(
            function (item) {

                return (
                    normalizedStatus(item) ===
                    "new"
                );

            }
        ).length;


    const reviewedCount =
        allSuggestions.filter(
            function (item) {

                return (
                    normalizedStatus(item) ===
                    "reviewed"
                );

            }
        ).length;


    const actionedCount =
        allSuggestions.filter(
            function (item) {

                return (
                    normalizedStatus(item) ===
                    "actioned"
                );

            }
        ).length;


    setText(
        "suggTotal",
        total
    );

    setText(
        "suggNew",
        newCount
    );

    setText(
        "suggReviewed",
        reviewedCount
    );

    setText(
        "suggActioned",
        actionedCount
    );


    if (
        allSuggestions.length === 0
    ) {

        suggestionsGrid.innerHTML = `
            <div class="no-data" style="grid-column: 1 / -1;">
                No suggestions have been submitted yet.
            </div>
        `;

        return;
    }


    suggestionsGrid.innerHTML =
        allSuggestions
            .map(
                function (suggestion) {

                    const status =
                        normalizedStatus(
                            suggestion
                        );


                    const statusLabels = {
                        "new": "New",
                        "reviewed": "Reviewed",
                        "actioned": "Actioned",
                        "archived": "Archived"
                    };


                    const category =
                        String(
                            suggestion.category ||
                            "Other"
                        )
                        .trim();


                    const categoryClass =
                        "cat-" +
                        category
                            .toLowerCase()
                            .replace(/\s+/g, "");


                    return `
                        <div class="suggestion-card">

                            <div class="suggestion-card-top">

                                <span class="category-pill ${categoryClass}">
                                    ${escapeHTML(
                                        category
                                    )}
                                </span>

                                <span class="suggestion-status status-${status}">
                                    ${statusLabels[status]}
                                </span>

                            </div>

                            <div class="suggestion-subject">
                                ${escapeHTML(
                                    suggestion.subject ||
                                    "Untitled suggestion"
                                )}
                            </div>

                            <div class="suggestion-body">
                                ${escapeHTML(
                                    suggestion.suggestion ||
                                    "-"
                                )}
                            </div>

                            <div class="suggestion-meta">
                                <span>
                                    ${
                                        suggestion.department
                                            ? "🏢 " + escapeHTML(suggestion.department)
                                            : "Department not specified"
                                    }
                                </span>
                                <span>
                                    ${formatDate(
                                        suggestion.created_at
                                    )}
                                </span>
                            </div>

                            <div class="suggestion-footer">

                                <select
                                    id="suggestionStatus-${suggestion.id}"
                                >
                                    <option value="new" ${status === "new" ? "selected" : ""}>New</option>
                                    <option value="reviewed" ${status === "reviewed" ? "selected" : ""}>Reviewed</option>
                                    <option value="actioned" ${status === "actioned" ? "selected" : ""}>Actioned</option>
                                    <option value="archived" ${status === "archived" ? "selected" : ""}>Archived</option>
                                </select>

                                <button
                                    type="button"
                                    onclick="updateSuggestionStatus('${suggestion.id}')"
                                >
                                    Update
                                </button>

                            </div>

                        </div>
                    `;

                }
            )
            .join("");

}


// =====================================================
// UPDATE SUGGESTION STATUS
// =====================================================

window.updateSuggestionStatus =
    async function (suggestionId) {

        const select =
            document.getElementById(
                "suggestionStatus-" + suggestionId
            );


        if (!select) {
            return;
        }


        const newStatus =
            select.value;


        const button =
            select.nextElementSibling;


        if (button) {

            button.disabled =
                true;

            button.textContent =
                "Saving...";

        }


        try {

            const {
                error
            } =
                await supabaseClient
                    .from("suggestions")
                    .update({

                        status:
                            newStatus

                    })
                    .eq(
                        "id",
                        suggestionId
                    );


            if (error) {

                throw error;

            }


            await loadSuggestions();

            renderSuggestions();


        } catch (error) {

            console.error(
                "Suggestion update error:",
                error
            );


            alert(
                "Unable to update this suggestion.\n\n" +
                error.message
            );


            if (button) {

                button.disabled =
                    false;

                button.textContent =
                    "Update";

            }

        }

};


// =====================================================
// REPORT PERIOD
// =====================================================

if (reportPeriod) {

    reportPeriod.addEventListener(
        "change",
        async function () {

            await loadDashboard();

        }
    );

}


// =====================================================
// LOGOUT
// =====================================================

if (logoutBtn) {

    logoutBtn.addEventListener(
        "click",
        async function () {

            const confirmed =
                confirm(
                    "Are you sure you want to logout?"
                );


            if (!confirmed) {
                return;
            }


            const {
                error
            } =
                await supabaseClient
                    .auth
                    .signOut();


            if (error) {

                console.error(
                    "Logout error:",
                    error
                );

                alert(
                    "Unable to logout.\n\n" +
                    error.message
                );

                return;
            }


            window.location.href =
                "index.html";

        }
    );

}


// =====================================================
// AUTOMATIC REFRESH
// =====================================================

setInterval(
    async function () {

        if (!currentUser) {
            return;
        }


        try {

            await loadDashboard();

        } catch (error) {

            console.error(
                "Automatic refresh error:",
                error
            );

        }

    },
    60000
);


// =====================================================
// HELPER: SET TEXT
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
            value ?? "0";

    }

}


// =====================================================
// HELPER: FORMAT TICKET ID
// =====================================================

function formatTicketId(id) {

    if (!id) {

        return "N/A";

    }


    const text =
        String(id);


    if (
        text.length > 12
    ) {

        return "#" +
            text
                .substring(
                    0,
                    8
                )
                .toUpperCase();

    }


    return "#" +
        text.toUpperCase();

}


// =====================================================
// HELPER: FORMAT DATE
// =====================================================

function formatDate(
    dateValue
) {

    if (!dateValue) {

        return "-";

    }


    const date =
        new Date(
            dateValue
        );


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        return "-";

    }


    return date.toLocaleString(
        "en-NG",
        {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        }
    );

}


// =====================================================
// HELPER: FORMAT APPROVAL DATE
// =====================================================

function formatApprovalDate(
    ticket
) {

    const status =
        String(
            ticket.approval_status ||
            ""
        )
        .trim()
        .toLowerCase();


    if (
        status === "approved"
    ) {

        return formatDate(
            ticket.approved_at
        );

    }


    if (
        status === "rejected" ||
        status === "declined"
    ) {

        return formatDate(
            ticket.rejected_at
        );

    }


    return formatDate(
        ticket.updated_at ||
        ticket.created_at
    );

}


// =====================================================
// HELPER: STATUS CLASS
// =====================================================

function getStatusClass(
    status
) {

    const value =
        String(
            status || ""
        )
        .trim()
        .toLowerCase();


    if (
        value === "resolved" ||
        value === "closed" ||
        value === "completed" ||
        value === "approved" ||
        value === "good" ||
        value === "working" ||
        value === "active"
    ) {

        return "resolved";

    }


    if (
        value === "rejected" ||
        value === "declined" ||
        value === "faulty" ||
        value === "damaged" ||
        value === "bad"
    ) {

        return "rejected";

    }


    return "open";

}


// =====================================================
// HELPER: ESCAPE HTML
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
// AUTH STATE LISTENER
// =====================================================

supabaseClient.auth.onAuthStateChange(
    function (
        event,
        session
    ) {

        if (
            event === "SIGNED_OUT"
        ) {

            window.location.href =
                "index.html";

        }

    }
);