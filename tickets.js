// ==========================================
// FLEETWOOD IT SUPPORT
// TICKETS MANAGEMENT
// ==========================================

// ==========================================
// SUPABASE CONFIGURATION
// ==========================================

const SUPABASE_URL =
    "https://xcfobyusisjbfbnsohjz.supabase.co";

const SUPABASE_ANON_KEY =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhjZm9ieXVzaXNqYmZibnNvaGp6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg3ODc5NzEsImV4cCI6MjEwNDM2Mzk3MX0.ATSzb3RKqGDNPEL_YdORwBzsQJPMIqONzJJaG7LW9YU";


// Create Supabase client
const supabaseClient =
    window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_ANON_KEY
    );


// ==========================================
// ELEMENTS
// ==========================================

const ticketsBody =
    document.getElementById("allTicketsBody");

const searchTicket =
    document.getElementById("searchTicket");

const statusFilter =
    document.getElementById("statusFilter");

const priorityFilter =
    document.getElementById("priorityFilter");

const categoryFilter =
    document.getElementById("categoryFilter");

const ticketModal =
    document.getElementById("ticketModal");

const closeModal =
    document.getElementById("closeModal");

const saveTicket =
    document.getElementById("saveTicket");

const updateStatus =
    document.getElementById("updateStatus");

const updatePriority =
    document.getElementById("updatePriority");

const closedMessage =
    document.getElementById("closedMessage");


// ==========================================
// DATA
// ==========================================

let allTickets = [];
let selectedTicket = null;
let currentProfile = null;


// ==========================================
// CHECK SUPABASE CONNECTION
// ==========================================

async function checkSupabaseConnection() {

    try {

        const { error } =
            await supabaseClient
                .from("tickets")
                .select("id")
                .limit(1);

        if (error) {

            console.error(
                "Supabase connection/database error:",
                error
            );

            return false;
        }

        return true;

    } catch (error) {

        console.error(
            "Supabase connection failed:",
            error
        );

        return false;
    }
}


// ==========================================
// SESSION CHECK
// ==========================================

async function checkTicketsSession() {

    const {
        data: { session }
    } = await supabaseClient.auth.getSession();

    if (!session) {
        window.location.href = "index.html";
        return false;
    }

    const {
        data: profile,
        error
    } = await supabaseClient
        .from("user_profiles")
        .select("*")
        .eq("id", session.user.id)
        .single();

    if (error || !profile) {
        window.location.href = "index.html";
        return false;
    }

    const role = String(profile.role || "").toLowerCase();

    if (role !== "it" && role !== "manager" && role !== "admin") {
        alert("You do not have permission to view this page.");
        window.location.href = "index.html";
        return false;
    }

    currentProfile = profile;

    return true;
}


// ==========================================
// LOAD TICKETS
// ==========================================

async function loadTickets() {

    if (!ticketsBody) {

        console.error(
            "Element #allTicketsBody was not found."
        );

        return;
    }


    // Show loading message

    ticketsBody.innerHTML = `
        <tr>
            <td colspan="8" class="empty-message">
                Loading tickets...
            </td>
        </tr>
    `;


    try {

        const { data, error } =
            await supabaseClient
                .from("tickets")
                .select("*")
                .order(
                    "created_at",
                    {
                        ascending: false
                    }
                );


        // ==========================================
        // DATABASE ERROR
        // ==========================================

        if (error) {

            console.error(
                "Ticket loading error:",
                error
            );

            ticketsBody.innerHTML = `
                <tr>
                    <td colspan="8" class="empty-message">
                        <strong>Failed to load tickets.</strong>
                        <br><br>
                        ${escapeHTML(error.message || "Unknown error")}
                    </td>
                </tr>
            `;

            return;
        }


        // ==========================================
        // SAVE TICKETS
        // ==========================================

        allTickets =
            data || [];


        // ==========================================
        // AUTOMATICALLY CLOSE OLD TICKETS
        // ==========================================

        await automaticallyCloseOldTickets();


        // ==========================================
        // RELOAD AFTER AUTOMATIC CLOSURE
        // ==========================================

        const {
            data: refreshedData,
            error: refreshedError
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


        if (
            !refreshedError &&
            refreshedData
        ) {

            allTickets =
                refreshedData;
        }


        // ==========================================
        // DISPLAY TICKETS
        // ==========================================

        renderTickets(
            allTickets
        );

    } catch (error) {

        console.error(
            "Unexpected ticket loading error:",
            error
        );

        ticketsBody.innerHTML = `
            <tr>
                <td colspan="8" class="empty-message">
                    <strong>Unable to load tickets.</strong>
                    <br><br>
                    ${escapeHTML(error.message || "Unknown error")}
                </td>
            </tr>
        `;
    }
}


// ==========================================
// AUTOMATIC 3-DAY CLOSURE
// ==========================================

async function automaticallyCloseOldTickets() {

    if (!allTickets.length) {
        return;
    }


    const now =
        new Date();


    const threeDays =
        3 * 24 * 60 * 60 * 1000;


    const overdueTickets =
        allTickets.filter(
            ticket => {

                const status =
                    ticket.status ||
                    "Open";


                // Do not touch already completed tickets

                if (
                    status !== "Open" &&
                    status !== "In Progress"
                ) {

                    return false;
                }


                if (!ticket.created_at) {
                    return false;
                }


                const createdDate =
                    new Date(
                        ticket.created_at
                    );


                if (
                    isNaN(
                        createdDate.getTime()
                    )
                ) {

                    return false;
                }


                const age =
                    now.getTime() -
                    createdDate.getTime();


                return age >= threeDays;
            }
        );


    if (
        !overdueTickets.length
    ) {

        return;
    }


    console.log(
        `${overdueTickets.length} overdue ticket(s) found.`
    );


    for (
        const ticket of overdueTickets
    ) {

        try {

            // First try to update status
            // and closed_at

            let result =
                await supabaseClient
                    .from("tickets")
                    .update({
                        status: "Closed",
                        closed_at:
                            new Date().toISOString()
                    })
                    .eq(
                        "id",
                        ticket.id
                    );


            // If closed_at does not exist,
            // update status only.

            if (
                result.error
            ) {

                console.warn(
                    "closed_at update failed. Trying status only:",
                    result.error.message
                );


                result =
                    await supabaseClient
                        .from("tickets")
                        .update({
                            status: "Closed"
                        })
                        .eq(
                            "id",
                            ticket.id
                        );
            }


            if (
                result.error
            ) {

                console.error(
                    `Could not automatically close ticket ${ticket.id}:`,
                    result.error
                );

            } else {

                console.log(
                    `Ticket IT-${String(ticket.id).padStart(3, "0")} automatically closed.`
                );
            }

        } catch (error) {

            console.error(
                "Automatic closure error:",
                error
            );
        }
    }
}


// ==========================================
// RENDER TICKETS
// ==========================================

function renderTickets(
    tickets
) {

    if (
        !tickets ||
        !tickets.length
    ) {

        ticketsBody.innerHTML = `
            <tr>
                <td colspan="8" class="empty-message">
                    No tickets found.
                </td>
            </tr>
        `;

        return;
    }


    ticketsBody.innerHTML =
        tickets
            .map(
                ticket => {

                    const ticketNumber =
                        `IT-${String(ticket.id).padStart(3, "0")}`;


                    const priority =
                        ticket.priority ||
                        "Normal";


                    const status =
                        ticket.status ||
                        "Open";


                    const category =
                        ticket.category ||
                        "IT Support";


                    return `
                        <tr>

                            <!-- TICKET NUMBER -->
                            <td>
                                <span class="ticket-number">
                                    ${ticketNumber}
                                </span>
                            </td>


                            <!-- STAFF -->
                            <td>
                                ${escapeHTML(
                                    ticket.requester_name ||
                                    "-"
                                )}
                            </td>


                            <!-- DEPARTMENT -->
                            <td>
                                ${escapeHTML(
                                    ticket.department ||
                                    "-"
                                )}
                            </td>


                            <!-- REQUEST TYPE -->
                            <td>
                                ${escapeHTML(
                                    category
                                )}
                            </td>


                            <!-- SUBJECT -->
                            <td>
                                ${escapeHTML(
                                    ticket.subject ||
                                    "-"
                                )}
                            </td>


                            <!-- PRIORITY -->
                            <td>
                                <span
                                    class="priority ${priorityClass(priority)}"
                                >
                                    ${escapeHTML(
                                        priority
                                    )}
                                </span>
                            </td>


                            <!-- STATUS -->
                            <td>
                                <span
                                    class="status ${statusClass(status)}"
                                >
                                    ${escapeHTML(
                                        status
                                    )}
                                </span>
                            </td>


                            <!-- ACTION -->
                            <!--
                                FIX: previously this was
                                onclick="openTicket(${ticket.id})"
                                which breaks if ticket.id is a UUID
                                (hyphens get parsed as subtraction)
                                or contains any special character.
                                Using a data attribute + delegated
                                click listener avoids that entirely.
                            -->
                            <td>
                                <div class="action-buttons">
                                    <button
                                        class="view-btn"
                                        data-id="${escapeHTML(String(ticket.id))}"
                                    >
                                        View
                                    </button>

                                    <button
                                        class="delete-btn"
                                        data-id="${escapeHTML(String(ticket.id))}"
                                    >
                                        Delete
                                    </button>
                                </div>
                            </td>

                        </tr>
                    `;
                }
            )
            .join("");
}


// ==========================================
// VIEW BUTTON CLICKS (event delegation)
// ==========================================

if (ticketsBody) {

    ticketsBody.addEventListener(
        "click",
        function(event) {

            const button =
                event.target.closest(".view-btn");

            if (!button) {
                return;
            }

            openTicket(
                button.dataset.id
            );
        }
    );
}


// ==========================================
// DELETE BUTTON CLICKS (event delegation)
// ==========================================

if (ticketsBody) {

    ticketsBody.addEventListener(
        "click",
        function(event) {

            const button =
                event.target.closest(".delete-btn");

            if (!button) {
                return;
            }

            deleteTicket(
                button.dataset.id
            );
        }
    );
}


// ==========================================
// STATUS CLASS
// ==========================================

function statusClass(
    status
) {

    if (
        status === "Open"
    ) {

        return "open";
    }


    if (
        status === "In Progress"
    ) {

        return "progress";
    }


    if (
        status === "Resolved"
    ) {

        return "resolved";
    }


    if (
        status === "Closed"
    ) {

        return "closed";
    }


    return "";
}


// ==========================================
// PRIORITY CLASS
// ==========================================

function priorityClass(
    priority
) {

    if (!priority) {

        return "normal";
    }


    return String(priority)
        .toLowerCase()
        .replace(
            /\s+/g,
            "-"
        );
}


// ==========================================
// OPEN TICKET
// ==========================================

function openTicket(id) {

        selectedTicket =
            allTickets.find(
                ticket =>
                    String(ticket.id) ===
                    String(id)
            );


        if (!selectedTicket) {

            alert(
                "Ticket could not be found."
            );

            return;
        }


        const ticketNumber =
            `IT-${String(selectedTicket.id).padStart(3, "0")}`;


        // ==========================================
        // MODAL INFORMATION
        // ==========================================

        document.getElementById(
            "modalTicketNumber"
        ).textContent =
            ticketNumber;


        document.getElementById(
            "modalSubject"
        ).textContent =
            selectedTicket.subject ||
            "IT Support Request";


        document.getElementById(
            "modalStaff"
        ).textContent =
            selectedTicket.requester_name ||
            "-";


        document.getElementById(
            "modalDepartment"
        ).textContent =
            selectedTicket.department ||
            "-";


        document.getElementById(
            "modalCategory"
        ).textContent =
            selectedTicket.category ||
            "-";


        document.getElementById(
            "modalPriority"
        ).textContent =
            selectedTicket.priority ||
            "Normal";


        document.getElementById(
            "modalStatus"
        ).textContent =
            selectedTicket.status ||
            "Open";


        document.getElementById(
            "modalDescription"
        ).textContent =
            selectedTicket.description ||
            "No description provided.";


        document.getElementById(
            "modalDate"
        ).textContent =
            formatDate(
                selectedTicket.created_at
            );


        // ==========================================
        // STATUS
        // ==========================================

        const currentStatus =
            selectedTicket.status ||
            "Open";


        // ==========================================
        // CLOSED TICKET
        // ==========================================

        if (
            currentStatus === "Closed"
        ) {

            updateStatus.value =
                "Open";


            updateStatus.disabled =
                true;


            updatePriority.disabled =
                true;


            saveTicket.style.display =
                "none";


            closedMessage.style.display =
                "block";

        }


        // ==========================================
        // ACTIVE TICKET
        // ==========================================

        else {

            updateStatus.value =
                currentStatus;


            updateStatus.disabled =
                false;


            updatePriority.disabled =
                false;


            saveTicket.style.display =
                "block";


            closedMessage.style.display =
                "none";
        }


        updatePriority.value =
            selectedTicket.priority ||
            "Normal";


        // ==========================================
        // SHOW MODAL
        // ==========================================

        ticketModal.classList.add(
            "show"
        );
}


// ==========================================
// CLOSE MODAL
// ==========================================

if (closeModal) {

    closeModal.addEventListener(
        "click",
        function() {

            ticketModal.classList.remove(
                "show"
            );
        }
    );
}


// ==========================================
// CLOSE MODAL WHEN CLICKING OUTSIDE
// ==========================================

if (ticketModal) {

    ticketModal.addEventListener(
        "click",
        function(event) {

            if (
                event.target ===
                ticketModal
            ) {

                ticketModal.classList.remove(
                    "show"
                );
            }
        }
    );
}


// ==========================================
// UPDATE TICKET
// ==========================================

if (saveTicket) {

    saveTicket.addEventListener(
        "click",
        async function() {

            if (!selectedTicket) {

                alert(
                    "No ticket selected."
                );

                return;
            }


            const newStatus =
                updateStatus.value;


            const newPriority =
                updatePriority.value;


            // ==========================================
            // PREVENT MANUAL CLOSURE
            // ==========================================

            if (
                newStatus !== "Open" &&
                newStatus !== "In Progress" &&
                newStatus !== "Resolved"
            ) {

                alert(
                    "You cannot manually close a ticket."
                );

                return;
            }


            // ==========================================
            // BUTTON LOADING
            // ==========================================

            saveTicket.disabled =
                true;


            saveTicket.textContent =
                "Saving...";


            // ==========================================
            // UPDATE DATA
            // ==========================================

            const basicUpdate = {

                status:
                    newStatus,

                priority:
                    newPriority
            };


            // ==========================================
            // RESOLVED DATE
            // ==========================================

            if (
                newStatus === "Resolved"
            ) {

                basicUpdate.resolved_at =
                    new Date().toISOString();
            }


            // ==========================================
            // UPDATE SUPABASE
            // ==========================================

            let result =
                await supabaseClient
                    .from("tickets")
                    .update(
                        basicUpdate
                    )
                    .eq(
                        "id",
                        selectedTicket.id
                    );


            // ==========================================
            // RETRY WITHOUT resolved_at
            // ==========================================

            if (
                result.error &&
                newStatus === "Resolved"
            ) {

                console.warn(
                    "Retrying without resolved_at:",
                    result.error.message
                );


                result =
                    await supabaseClient
                        .from("tickets")
                        .update({
                            status:
                                newStatus,

                            priority:
                                newPriority
                        })
                        .eq(
                            "id",
                            selectedTicket.id
                        );
            }


            // ==========================================
            // UPDATE ERROR
            // ==========================================

            if (
                result.error
            ) {

                console.error(
                    "Ticket update failed:",
                    result.error
                );


                alert(
                    "Ticket could not be updated.\n\n" +
                    "Supabase error:\n" +
                    (result.error.message || "Unknown error")
                );


                saveTicket.disabled =
                    false;


                saveTicket.textContent =
                    "Save Changes";


                return;
            }


            // ==========================================
            // UPDATE LOCAL DATA
            // ==========================================

            selectedTicket.status =
                newStatus;


            selectedTicket.priority =
                newPriority;


            document.getElementById(
                "modalStatus"
            ).textContent =
                newStatus;


            document.getElementById(
                "modalPriority"
            ).textContent =
                newPriority;


            // ==========================================
            // RELOAD TABLE
            // ==========================================

            await loadTickets();


            // ==========================================
            // SUCCESS
            // ==========================================

            alert(
                `Ticket IT-${String(selectedTicket.id).padStart(3, "0")} updated successfully.`
            );


            ticketModal.classList.remove(
                "show"
            );


            saveTicket.disabled =
                false;


            saveTicket.textContent =
                "Save Changes";
        }
    );
}


// ==========================================
// DELETE TICKET
// ==========================================

async function deleteTicket(id) {

    // ==========================================
    // PERMISSION CHECK
    //
    // Anyone who can access this page (IT,
    // Manager, Admin) can delete a ticket, since
    // this page already lets all three update
    // ticket status/priority freely. Tighten this
    // to IT-only (like deleteAsset in assets.js)
    // if you'd rather restrict deletion further.
    // ==========================================

    const role =
        String(
            currentProfile?.role ||
            ""
        ).toLowerCase();


    if (
        role !== "it" &&
        role !== "manager" &&
        role !== "admin"
    ) {

        alert(
            "You do not have permission to delete tickets."
        );

        return;
    }


    const ticket =
        allTickets.find(
            item =>
                String(item.id) ===
                String(id)
        );


    if (!ticket) {
        return;
    }


    const ticketNumber =
        `IT-${String(ticket.id).padStart(3, "0")}`;


    const confirmed =
        confirm(
            "Are you sure you want to permanently delete this ticket?\n\n" +
            `${ticketNumber} — ${ticket.subject || "No subject"}\n\n` +
            "This cannot be undone."
        );


    if (!confirmed) {
        return;
    }


    try {

        const { error } =
            await supabaseClient
                .from("tickets")
                .delete()
                .eq("id", id);


        if (error) {
            throw error;
        }


        // If the deleted ticket is currently open
        // in the modal, close the modal so we don't
        // leave a "ghost" ticket on screen.

        if (
            selectedTicket &&
            String(selectedTicket.id) === String(id)
        ) {

            selectedTicket = null;

            if (ticketModal) {

                ticketModal.classList.remove(
                    "show"
                );
            }
        }


        alert(
            `Ticket ${ticketNumber} was deleted successfully.`
        );


        await loadTickets();


    } catch (error) {

        console.error(
            "Delete ticket error:",
            error
        );

        alert(
            "Unable to delete this ticket.\n\n" +
            (error.message || "Unknown error")
        );
    }
}


// ==========================================
// FILTER TICKETS
// ==========================================

function filterTickets() {

    const search =
        searchTicket.value
            .toLowerCase()
            .trim();


    const status =
        statusFilter.value;


    const priority =
        priorityFilter.value;


    const category =
        categoryFilter.value;


    const filtered =
        allTickets.filter(
            ticket => {

                const searchableText = `
                    ${ticket.id || ""}
                    ${ticket.requester_name || ""}
                    ${ticket.department || ""}
                    ${ticket.subject || ""}
                    ${ticket.description || ""}
                    ${ticket.category || ""}
                `.toLowerCase();


                const matchesSearch =
                    !search ||
                    searchableText.includes(
                        search
                    );


                const matchesStatus =
                    !status ||
                    ticket.status ===
                    status;


                const matchesPriority =
                    !priority ||
                    ticket.priority ===
                    priority;


                const matchesCategory =
                    !category ||
                    ticket.category ===
                    category;


                return (
                    matchesSearch &&
                    matchesStatus &&
                    matchesPriority &&
                    matchesCategory
                );
            }
        );


    renderTickets(
        filtered
    );
}


// ==========================================
// FILTER EVENTS
// ==========================================

if (searchTicket) {

    searchTicket.addEventListener(
        "input",
        filterTickets
    );
}


if (statusFilter) {

    statusFilter.addEventListener(
        "change",
        filterTickets
    );
}


if (priorityFilter) {

    priorityFilter.addEventListener(
        "change",
        filterTickets
    );
}


if (categoryFilter) {

    categoryFilter.addEventListener(
        "change",
        filterTickets
    );
}


// ==========================================
// DATE FORMAT
// ==========================================

function formatDate(
    date
) {

    if (!date) {

        return "-";
    }


    const parsedDate =
        new Date(date);


    if (
        isNaN(
            parsedDate.getTime()
        )
    ) {

        return "-";
    }


    return parsedDate.toLocaleString(
        "en-NG",
        {
            day:
                "2-digit",

            month:
                "short",

            year:
                "numeric",

            hour:
                "2-digit",

            minute:
                "2-digit"
        }
    );
}


// ==========================================
// SECURITY
// ==========================================

function escapeHTML(
    value
) {

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


// ==========================================
// INITIAL LOAD
// ==========================================

document.addEventListener(
    "DOMContentLoaded",
    async function() {

        const allowed = await checkTicketsSession();

        if (!allowed) {
            return;
        }

        loadTickets();

    }
);