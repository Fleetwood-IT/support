// =====================================================
// FLEETWOOD IT SUPPORT CENTER
// MAIN DASHBOARD JAVASCRIPT
// VERSION 3.0
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
let currentProfile = null;
let allTickets = [];

let isSubmitting = false;


// =====================================================
// DOM ELEMENTS
// =====================================================

let ticketModal;
let ticketForm;

let ticketsTableBody;

let statOpen;
let statProgress;
let statResolved;
let statHigh;

let overviewTotal;


// =====================================================
// INITIALIZE PAGE
// =====================================================

document.addEventListener("DOMContentLoaded", async () => {

    // Get DOM elements
    ticketModal = document.getElementById("ticketModal");
    ticketForm = document.getElementById("ticketForm");

    ticketsTableBody = document.getElementById("ticketsTableBody");

    statOpen = document.getElementById("statOpen");
    statProgress = document.getElementById("statProgress");
    statResolved = document.getElementById("statResolved");
    statHigh = document.getElementById("statHigh");

    overviewTotal = document.getElementById("overviewTotal");


    // Setup modal
    setupTicketModal();


    // Check IT session
    const loggedIn = await checkITSession();

    if (!loggedIn) {
        return;
    }


    // Load dashboard
    await loadTickets();


    // Listen for authentication changes
    supabaseClient.auth.onAuthStateChange((event, session) => {

        if (event === "SIGNED_OUT") {
            window.location.href = "index.html";
        }

    });

});


// =====================================================
// SESSION CHECK
// =====================================================

async function checkITSession() {

    try {

        const {
            data: { session },
            error
        } = await supabaseClient.auth.getSession();


        if (error) {
            console.error("Session error:", error);
            window.location.href = "index.html";
            return false;
        }


        if (!session) {
            window.location.href = "index.html";
            return false;
        }


        currentUser = session.user;


        // Get user profile
        const { data: profile, error: profileError } =
            await supabaseClient
                .from("user_profiles")
                .select("id, full_name, role")
                .eq("id", currentUser.id)
                .single();


        if (profileError || !profile) {

            console.error("Profile error:", profileError);

            await supabaseClient.auth.signOut();

            window.location.href = "index.html";

            return false;
        }


        currentProfile = profile;


        // Only IT staff should access this dashboard
        if (String(profile.role).toLowerCase() !== "it") {

            console.warn("Unauthorized dashboard access.");

            if (
                String(profile.role).toLowerCase() === "manager" ||
                String(profile.role).toLowerCase() === "admin"
            ) {

                window.location.href = "manager.html";

            } else {

                window.location.href = "index.html";

            }

            return false;
        }


        // Save session information
        localStorage.setItem("fleetwoodRole", "it");
        localStorage.setItem(
            "fleetwoodUserName",
            profile.full_name || "IT Officer"
        );
        localStorage.setItem(
            "fleetwoodUserEmail",
            currentUser.email || ""
        );
        localStorage.setItem(
            "fleetwoodUserId",
            currentUser.id
        );


        // Update UI
        updateUserInformation(profile);


        return true;

    } catch (error) {

        console.error("Session check failed:", error);

        window.location.href = "index.html";

        return false;
    }
}


// =====================================================
// UPDATE USER INFORMATION
// =====================================================

function updateUserInformation(profile) {

    const userName = document.getElementById("itUserName");
    const userRole = document.getElementById("itUserRole");
    const userAvatar = document.getElementById("itUserAvatar");


    const name = profile.full_name || "IT Officer";


    if (userName) {
        userName.textContent = name;
    }


    if (userRole) {
        userRole.textContent = "IT Support";
    }


    if (userAvatar) {
        userAvatar.textContent = getInitials(name);
    }

}


// =====================================================
// GET INITIALS
// =====================================================

function getInitials(name) {

    if (!name) {
        return "IT";
    }


    const parts = name
        .trim()
        .split(/\s+/)
        .filter(Boolean);


    if (parts.length === 1) {
        return parts[0].substring(0, 2).toUpperCase();
    }


    return (
        parts[0][0] +
        parts[parts.length - 1][0]
    ).toUpperCase();
}


// =====================================================
// LOGOUT
// =====================================================

async function logoutIT() {

    try {

        await supabaseClient.auth.signOut();

    } catch (error) {

        console.error("Logout error:", error);

    }


    localStorage.removeItem("fleetwoodRole");
    localStorage.removeItem("fleetwoodUserName");
    localStorage.removeItem("fleetwoodUserEmail");
    localStorage.removeItem("fleetwoodUserId");


    window.location.href = "index.html";
}


// =====================================================
// TICKET MODAL
// =====================================================

function setupTicketModal() {

    if (!ticketModal) {
        return;
    }


    // Close when clicking outside modal
    ticketModal.addEventListener("click", (event) => {

        if (event.target === ticketModal) {
            closeTicketForm();
        }

    });


    // Escape key
    document.addEventListener("keydown", (event) => {

        if (
            event.key === "Escape" &&
            ticketModal.classList.contains("show")
        ) {

            closeTicketForm();

        }

    });


    // Form submission
    if (ticketForm) {

        ticketForm.addEventListener(
            "submit",
            submitTicket
        );

    }

}


// =====================================================
// OPEN TICKET FORM
// =====================================================

function openTicketForm() {

    if (!ticketModal) {
        return;
    }


    ticketModal.classList.add("show");
    ticketModal.style.display = "flex";


    // Reset form
    if (ticketForm) {
        ticketForm.reset();
    }


    // Focus requester field
    setTimeout(() => {

        const requester =
            document.getElementById("requesterName");

        if (requester) {
            requester.focus();
        }

    }, 200);

}


// =====================================================
// CLOSE TICKET FORM
// =====================================================

function closeTicketForm() {

    if (!ticketModal) {
        return;
    }


    ticketModal.classList.remove("show");


    setTimeout(() => {

        if (!ticketModal.classList.contains("show")) {
            ticketModal.style.display = "none";
        }

    }, 200);

}


// =====================================================
// SUBMIT NEW TICKET
// =====================================================

async function submitTicket(event) {

    event.preventDefault();


    if (isSubmitting) {
        return;
    }


    isSubmitting = true;


    const submitButton =
        ticketForm.querySelector(
            'button[type="submit"]'
        );


    try {

        // -------------------------------------------------
        // Get form values
        // -------------------------------------------------

        const requesterName =
            document.getElementById("requesterName")?.value.trim();

        const department =
            document.getElementById("department")?.value.trim();

        const category =
            document.getElementById("category")?.value.trim();

        const priority =
            document.getElementById("priority")?.value.trim();

        const subject =
            document.getElementById("subject")?.value.trim();

        const description =
            document.getElementById("description")?.value.trim();


        // -------------------------------------------------
        // Validate
        // -------------------------------------------------

        if (
            !requesterName ||
            !department ||
            !category ||
            !priority ||
            !subject ||
            !description
        ) {

            showNotification(
                "Please complete all required fields.",
                "error"
            );

            return;
        }


        // -------------------------------------------------
        // Get current session
        // -------------------------------------------------

        const {
            data: { session },
            error: sessionError
        } = await supabaseClient.auth.getSession();


        if (sessionError || !session) {

            showNotification(
                "Your session has expired. Please login again.",
                "error"
            );

            window.location.href = "index.html";

            return;
        }


        currentUser = session.user;


        // -------------------------------------------------
        // Get profile if necessary
        // -------------------------------------------------

        if (!currentProfile) {

            const { data: profile } =
                await supabaseClient
                    .from("user_profiles")
                    .select("id, full_name, role")
                    .eq("id", currentUser.id)
                    .single();


            currentProfile = profile;
        }


        const userRole =
            String(currentProfile?.role || "it")
                .toLowerCase();


        // -------------------------------------------------
        // IT TICKET WORKFLOW
        //
        // IT creates ticket:
        // Manager approval required
        // -------------------------------------------------

        let status;
        let approvalStatus;


        if (userRole === "it") {

            status = "Pending Approval";

            approvalStatus = "pending";

        } else {

            // Staff tickets go directly to IT
            status = "Open";

            approvalStatus = "not_required";

        }


        // -------------------------------------------------
        // Ticket object
        // -------------------------------------------------

        const ticketData = {

            requester_name: requesterName,

            department: department,

            category: category,

            priority: priority,

            subject: subject,

            description: description,

            status: status,

            created_by: currentUser.id,

            created_by_role: userRole,

            approval_status: approvalStatus

        };


        // -------------------------------------------------
        // Loading state
        // -------------------------------------------------

        if (submitButton) {

            submitButton.disabled = true;

            submitButton.dataset.originalText =
                submitButton.textContent;

            submitButton.textContent =
                "Submitting...";

        }


        // -------------------------------------------------
        // Insert ticket
        // -------------------------------------------------

        const {
            data,
            error
        } = await supabaseClient
            .from("tickets")
            .insert([ticketData])
            .select()
            .single();


        if (error) {

            console.error(
                "Ticket creation error:",
                error
            );

            throw error;
        }


        // -------------------------------------------------
        // Success
        // -------------------------------------------------

        closeTicketForm();


        if (userRole === "it") {

            showNotification(
                "Ticket created successfully. It has been sent to the Manager for approval.",
                "success"
            );

        } else {

            showNotification(
                "Ticket created successfully and sent directly to IT Support.",
                "success"
            );

        }


        // Reload dashboard
        await loadTickets();


    } catch (error) {

        console.error(
            "Submit ticket failed:",
            error
        );


        showNotification(
            error.message ||
            "Unable to create ticket. Please try again.",
            "error"
        );


    } finally {

        isSubmitting = false;


        if (submitButton) {

            submitButton.disabled = false;

            submitButton.textContent =
                submitButton.dataset.originalText ||
                "Create Ticket";

        }

    }

}


// =====================================================
// LOAD TICKETS
// =====================================================

async function loadTickets() {

    try {

        const {
            data,
            error
        } = await supabaseClient
            .from("tickets")
            .select("*")
            .order("created_at", {
                ascending: false
            });


        if (error) {
            throw error;
        }


        allTickets = data || [];


        // -------------------------------------------------
        // Only tickets available to IT
        //
        // Exclude:
        // pending approval
        // rejected tickets
        // -------------------------------------------------

        const visibleTickets =
            allTickets.filter(ticket => {

                const approval =
                    normalizeApprovalStatus(
                        ticket.approval_status
                    );


                if (approval === "pending") {
                    return false;
                }


                if (approval === "rejected") {
                    return false;
                }


                return true;

            });


        renderTickets(visibleTickets);

        updateStats(visibleTickets);

        updateOverview(visibleTickets);

        updateChart(visibleTickets);

        updateActivity(visibleTickets);


    } catch (error) {

        console.error(
            "Unable to load tickets:",
            error
        );


        if (ticketsTableBody) {

            ticketsTableBody.innerHTML = `
                <tr>
                    <td colspan="5" class="empty-state">
                        <div class="empty-icon">⚠️</div>
                        <strong>Unable to load tickets</strong>
                        <span>Please refresh the page and try again.</span>
                    </td>
                </tr>
            `;

        }

    }

}


// =====================================================
// NORMALIZE APPROVAL STATUS
// =====================================================

function normalizeApprovalStatus(value) {

    if (!value) {
        return "not_required";
    }


    const status =
        String(value)
            .trim()
            .toLowerCase()
            .replace(/\s+/g, "_");


    // Support old database values
    if (status === "not_required") {
        return "not_required";
    }


    if (status === "notrequired") {
        return "not_required";
    }


    if (status === "pending") {
        return "pending";
    }


    if (status === "approved") {
        return "approved";
    }


    if (
        status === "rejected" ||
        status === "declined"
    ) {

        return "rejected";

    }


    return status;
}


// =====================================================
// RENDER RECENT TICKETS
// =====================================================

function renderTickets(tickets) {

    if (!ticketsTableBody) {
        return;
    }


    // Only show recent tickets
    const recentTickets =
        tickets.slice(0, 8);


    if (recentTickets.length === 0) {

        ticketsTableBody.innerHTML = `
            <tr>
                <td colspan="5" class="empty-state">
                    <div class="empty-icon">🎫</div>
                    <strong>No tickets yet</strong>
                    <span>Create your first IT support ticket.</span>
                </td>
            </tr>
        `;

        return;
    }


    ticketsTableBody.innerHTML =
        recentTickets.map(ticket => {

            return `
                <tr>

                    <td>
                        <strong>
                            ${escapeHTML(
                                formatTicketId(ticket.id)
                            )}
                        </strong>
                    </td>

                    <td>
                        ${escapeHTML(
                            ticket.requester_name ||
                            "Unknown"
                        )}
                    </td>

                    <td>
                        <div class="ticket-subject">
                            ${escapeHTML(
                                ticket.subject ||
                                "No subject"
                            )}
                        </div>

                        <small>
                            ${escapeHTML(
                                ticket.category ||
                                "General"
                            )}
                        </small>
                    </td>

                    <td>
                        <span class="priority-badge ${priorityClass(ticket.priority)}">
                            ${escapeHTML(
                                ticket.priority ||
                                "Normal"
                            )}
                        </span>
                    </td>

                    <td>
                        <span class="status-badge ${statusClass(ticket.status)}">
                            ${escapeHTML(
                                ticket.status ||
                                "Open"
                            )}
                        </span>
                    </td>

                </tr>
            `;

        }).join("");

}


// =====================================================
// FORMAT TICKET ID
// =====================================================

function formatTicketId(id) {

    if (!id) {
        return "IT-TICKET";
    }


    const value =
        String(id);


    // Numeric IDs
    if (/^\d+$/.test(value)) {

        return `IT-${value.padStart(3, "0")}`;

    }


    // UUID IDs
    return `IT-${value.substring(0, 8).toUpperCase()}`;
}


// =====================================================
// PRIORITY CLASS
// =====================================================

function priorityClass(priority) {

    const value =
        String(priority || "")
            .toLowerCase();


    switch (value) {

        case "critical":
            return "critical";

        case "high":
            return "high";

        case "medium":
            return "normal";

        case "low":
            return "low";

        default:
            return "normal";

    }

}


// =====================================================
// STATUS CLASS
// =====================================================

function statusClass(status) {

    const value =
        String(status || "")
            .toLowerCase()
            .replace(/\s+/g, "_");


    if (
        value === "open"
    ) {

        return "open";

    }


    if (
        value === "in_progress" ||
        value === "progress" ||
        value === "working"
    ) {

        return "progress";

    }


    if (
        value === "resolved" ||
        value === "closed"
    ) {

        return "resolved";

    }


    if (
        value === "pending" ||
        value === "pending_approval"
    ) {

        return "pending";

    }


    if (
        value === "rejected"
    ) {

        return "rejected";

    }


    return "open";
}


// =====================================================
// UPDATE DASHBOARD STATISTICS
// =====================================================

function updateStats(tickets) {

    const open =
        tickets.filter(ticket =>
            normalizeTicketStatus(ticket.status)
            === "open"
        ).length;


    const progress =
        tickets.filter(ticket =>
            normalizeTicketStatus(ticket.status)
            === "in_progress"
        ).length;


    const resolved =
        tickets.filter(ticket =>
            normalizeTicketStatus(ticket.status)
            === "resolved"
        ).length;


    const high =
        tickets.filter(ticket => {

            const priority =
                String(ticket.priority || "")
                    .toLowerCase();

            return (
                priority === "high" ||
                priority === "critical"
            );

        }).length;


    animateNumber(
        statOpen,
        open
    );


    animateNumber(
        statProgress,
        progress
    );


    animateNumber(
        statResolved,
        resolved
    );


    animateNumber(
        statHigh,
        high
    );

}


// =====================================================
// NORMALIZE TICKET STATUS
// =====================================================

function normalizeTicketStatus(status) {

    const value =
        String(status || "")
            .trim()
            .toLowerCase()
            .replace(/\s+/g, "_");


    if (
        value === "open"
    ) {

        return "open";

    }


    if (
        value === "in_progress" ||
        value === "progress" ||
        value === "working"
    ) {

        return "in_progress";

    }


    if (
        value === "resolved" ||
        value === "closed"
    ) {

        return "resolved";

    }


    if (
        value === "pending" ||
        value === "pending_approval"
    ) {

        return "pending";

    }


    if (
        value === "rejected"
    ) {

        return "rejected";

    }


    return value;
}


// =====================================================
// ANIMATE NUMBER
// =====================================================

function animateNumber(element, target) {

    if (!element) {
        return;
    }


    const finalValue =
        Number(target) || 0;


    const startValue =
        Number(
            element.textContent
                .replace(/\D/g, "")
        ) || 0;


    if (startValue === finalValue) {

        element.textContent =
            finalValue;

        return;

    }


    const duration = 700;

    const startTime =
        performance.now();


    function update(currentTime) {

        const elapsed =
            currentTime - startTime;


        const progress =
            Math.min(
                elapsed / duration,
                1
            );


        const eased =
            1 - Math.pow(
                1 - progress,
                3
            );


        const current =
            Math.round(
                startValue +
                (
                    finalValue -
                    startValue
                ) * eased
            );


        element.textContent =
            current;


        if (progress < 1) {

            requestAnimationFrame(update);

        }

    }


    requestAnimationFrame(update);

}


// =====================================================
// UPDATE OVERVIEW
// =====================================================

function updateOverview(tickets) {

    if (!overviewTotal) {
        return;
    }


    animateNumber(
        overviewTotal,
        tickets.length
    );


    updateSummaryCircle(
        tickets
    );

}


// =====================================================
// UPDATE SUMMARY CIRCLE
// =====================================================

function updateSummaryCircle(tickets) {

    const circle =
        document.querySelector(
            ".summary-circle"
        );


    if (!circle) {
        return;
    }


    const total =
        tickets.length;


    const resolved =
        tickets.filter(ticket =>
            normalizeTicketStatus(ticket.status)
            === "resolved"
        ).length;


    let percentage = 0;


    if (total > 0) {

        percentage =
            Math.round(
                (resolved / total) * 100
            );

    }


    circle.style.setProperty(
        "--progress",
        `${percentage}%`
    );


    const percentageText =
        circle.querySelector(
            ".circle-percent"
        );


    if (percentageText) {

        percentageText.textContent =
            `${percentage}%`;

    }

}


// =====================================================
// UPDATE WEEKLY CHART
// =====================================================

function updateChart(tickets) {

    const bars =
        document.querySelectorAll(
            ".chart-bars .bar"
        );


    if (!bars.length) {
        return;
    }


    const now =
        new Date();


    // Find Monday
    const monday =
        new Date(now);


    const day =
        monday.getDay();


    const difference =
        day === 0
            ? -6
            : 1 - day;


    monday.setDate(
        monday.getDate() + difference
    );


    monday.setHours(
        0,
        0,
        0,
        0
    );


    const dailyCounts =
        Array(7).fill(0);


    tickets.forEach(ticket => {

        if (!ticket.created_at) {
            return;
        }


        const created =
            new Date(
                ticket.created_at
            );


        const index =
            Math.floor(
                (
                    created -
                    monday
                ) /
                (
                    1000 *
                    60 *
                    60 *
                    24
                )
            );


        if (
            index >= 0 &&
            index < 7
        ) {

            dailyCounts[index]++;

        }

    });


    const max =
        Math.max(
            ...dailyCounts,
            1
        );


    bars.forEach(
        (bar, index) => {

            const value =
                dailyCounts[index] || 0;


            const height =
                value === 0
                    ? 5
                    : Math.max(
                        10,
                        (
                            value /
                            max
                        ) * 100
                    );


            bar.style.height =
                `${height}%`;


            bar.setAttribute(
                "data-value",
                value
            );


            bar.title =
                `${value} ticket${value === 1 ? "" : "s"}`;

        }
    );

}


// =====================================================
// UPDATE ACTIVITY
// =====================================================

function updateActivity(tickets) {

    const activityList =
        document.querySelector(
            ".activity-list"
        );


    if (!activityList) {
        return;
    }


    const recent =
        tickets.slice(0, 5);


    if (!recent.length) {

        activityList.innerHTML = `
            <div class="activity-empty">
                No recent activity
            </div>
        `;

        return;
    }


    activityList.innerHTML =
        recent.map(ticket => {

            const status =
                ticket.status ||
                "Open";


            return `
                <div class="activity-item">

                    <div class="activity-icon">
                        ${getActivityIcon(status)}
                    </div>

                    <div class="activity-content">

                        <strong>
                            ${escapeHTML(
                                ticket.subject ||
                                "Support ticket"
                            )}
                        </strong>

                        <span>
                            ${escapeHTML(status)}
                            •
                            ${timeAgo(
                                ticket.created_at
                            )}
                        </span>

                    </div>

                </div>
            `;

        }).join("");

}


// =====================================================
// ACTIVITY ICON
// =====================================================

function getActivityIcon(status) {

    const value =
        String(status || "")
            .toLowerCase();


    if (value.includes("resolved")) {
        return "✓";
    }


    if (value.includes("progress")) {
        return "⚙";
    }


    if (value.includes("reject")) {
        return "✕";
    }


    if (value.includes("pending")) {
        return "⏳";
    }


    return "🎫";
}


// =====================================================
// TIME AGO
// =====================================================

function timeAgo(dateString) {

    if (!dateString) {
        return "Recently";
    }


    const date =
        new Date(dateString);


    if (isNaN(date.getTime())) {
        return "Recently";
    }


    const now =
        new Date();


    const seconds =
        Math.floor(
            (
                now -
                date
            ) / 1000
        );


    if (seconds < 60) {
        return "Just now";
    }


    const minutes =
        Math.floor(
            seconds / 60
        );


    if (minutes < 60) {

        return `${minutes}m ago`;

    }


    const hours =
        Math.floor(
            minutes / 60
        );


    if (hours < 24) {

        return `${hours}h ago`;

    }


    const days =
        Math.floor(
            hours / 24
        );


    if (days < 7) {

        return `${days}d ago`;

    }


    return date.toLocaleDateString(
        "en-GB",
        {
            day: "2-digit",
            month: "short"
        }
    );

}


// =====================================================
// NOTIFICATION SYSTEM
// =====================================================

function showNotification(
    message,
    type = "success"
) {

    // Remove existing notification
    const old =
        document.querySelector(
            ".fleet-notification"
        );


    if (old) {
        old.remove();
    }


    const notification =
        document.createElement("div");


    notification.className =
        `fleet-notification ${type}`;


    const icon =
        type === "success"
            ? "✓"
            : type === "error"
                ? "!"
                : "ℹ";


    notification.innerHTML = `

        <div class="notification-icon">
            ${icon}
        </div>

        <div class="notification-message">
            ${escapeHTML(message)}
        </div>

        <button
            type="button"
            class="notification-close"
            aria-label="Close"
        >
            ×
        </button>

    `;


    document.body.appendChild(
        notification
    );


    const closeButton =
        notification.querySelector(
            ".notification-close"
        );


    if (closeButton) {

        closeButton.addEventListener(
            "click",
            () => notification.remove()
        );

    }


    // Animate in
    requestAnimationFrame(() => {

        notification.classList.add(
            "show"
        );

    });


    // Remove after 5 seconds
    setTimeout(() => {

        notification.classList.remove(
            "show"
        );


        setTimeout(() => {

            if (notification.parentNode) {
                notification.remove();
            }

        }, 300);

    }, 5000);

}


// =====================================================
// ESCAPE HTML
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
// AUTO REFRESH
// =====================================================

setInterval(
    async () => {

        // Don't refresh while user is typing/submitting
        if (isSubmitting) {
            return;
        }


        // Don't refresh hidden browser tabs
        if (
            document.visibilityState !==
            "visible"
        ) {

            return;

        }


        await loadTickets();

    },
    60000
);


// =====================================================
// PAGE VISIBILITY REFRESH
// =====================================================

document.addEventListener(
    "visibilitychange",
    async () => {

        if (
            document.visibilityState ===
            "visible"
        ) {

            const {
                data: { session }
            } =
                await supabaseClient.auth.getSession();


            if (session) {
                await loadTickets();
            }

        }

    }
);


// =====================================================
// GLOBAL FUNCTIONS
// =====================================================

window.openTicketForm =
    openTicketForm;

window.closeTicketForm =
    closeTicketForm;

window.logoutIT =
    logoutIT;

window.loadTickets =
    loadTickets;