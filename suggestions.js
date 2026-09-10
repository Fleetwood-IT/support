// ============================================
// FLEETWOOD IT SUPPORT
// MANAGEMENT SUGGESTION BOX
// ============================================


// ============================================
// SUPABASE
// ============================================

const SUPABASE_URL =
    "https://xcfobyusisjbfbnsohjz.supabase.co";

const SUPABASE_ANON_KEY =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhjZm9ieXVzaXNqYmZibnNvaGp6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg3ODc5NzEsImV4cCI6MjEwNDM2Mzk3MX0.ATSzb3RKqGDNPEL_YdORwBzsQJPMIqONzJJaG7LW9YU";


const supabaseClient =
    supabase.createClient(
        SUPABASE_URL,
        SUPABASE_ANON_KEY
    );


// ============================================
// VARIABLES
// ============================================

let allSuggestions = [];

let currentSuggestion = null;


// ============================================
// PAGE LOAD
// ============================================

document.addEventListener(
    "DOMContentLoaded",
    function () {

        checkSession();

        document
            .getElementById("searchSuggestions")
            .addEventListener(
                "input",
                filterSuggestions
            );


        document
            .getElementById("categoryFilter")
            .addEventListener(
                "change",
                filterSuggestions
            );


        document
            .getElementById("statusFilter")
            .addEventListener(
                "change",
                filterSuggestions
            );

    }
);


// ============================================
// CHECK SESSION
// ============================================

async function checkSession() {

    try {

        const {
            data: {
                session
            }
        } =
            await supabaseClient
                .auth
                .getSession();


        if (!session) {

            window.location.href =
                "index.html";

            return;

        }


        // ====================================
        // CHECK USER ROLE
        // ====================================

        const {
            data: profile,
            error
        } =
            await supabaseClient
                .from("user_profiles")
                .select("role")
                .eq("id", session.user.id)
                .single();


        if (error) {

            console.error(
                "Profile error:",
                error
            );

            alert(
                "Unable to verify your account role."
            );

            window.location.href =
                "index.html";

            return;

        }


        const role =
            String(profile.role || "")
                .toLowerCase();


        if (
            role !== "it" &&
            role !== "manager" &&
            role !== "admin"
        ) {

            alert(
                "You do not have permission to view suggestions."
            );

            window.location.href =
                "index.html";

            return;

        }


        // ====================================
        // LOAD SUGGESTIONS
        // ====================================

        loadSuggestions();

    }

    catch (error) {

        console.error(error);

        window.location.href =
            "index.html";

    }

}


// ============================================
// LOAD SUGGESTIONS
// ============================================

async function loadSuggestions() {

    const tbody =
        document.getElementById(
            "suggestionsBody"
        );


    tbody.innerHTML = `
        <tr>
            <td colspan="7"
                style="text-align:center;padding:35px;">
                Loading suggestions...
            </td>
        </tr>
    `;


    try {

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

            console.error(
                "Load suggestions error:",
                error
            );

            tbody.innerHTML = `
                <tr>
                    <td colspan="7"
                        style="text-align:center;padding:35px;color:#dc2626;">
                        Unable to load suggestions.
                    </td>
                </tr>
            `;

            return;

        }


        allSuggestions =
            data || [];


        updateSummary(
            allSuggestions
        );


        filterSuggestions();

    }

    catch (error) {

        console.error(error);

        tbody.innerHTML = `
            <tr>
                <td colspan="7"
                    style="text-align:center;padding:35px;color:#dc2626;">
                    An unexpected error occurred.
                </td>
            </tr>
        `;

    }

}


// ============================================
// SUMMARY
// ============================================

function updateSummary(
    suggestions
) {

    document.getElementById(
        "newCount"
    ).textContent =
        countStatus(
            suggestions,
            "New"
        );


    document.getElementById(
        "reviewCount"
    ).textContent =
        countStatus(
            suggestions,
            "Under Review"
        );


    document.getElementById(
        "progressCount"
    ).textContent =
        countStatus(
            suggestions,
            "In Progress"
        );


    document.getElementById(
        "implementedCount"
    ).textContent =
        countStatus(
            suggestions,
            "Implemented"
        );


    document.getElementById(
        "rejectedCount"
    ).textContent =
        countStatus(
            suggestions,
            "Rejected"
        );

}


// ============================================
// COUNT STATUS
// ============================================

function countStatus(
    suggestions,
    status
) {

    return suggestions.filter(
        function (item) {

            return item.status === status;

        }
    ).length;

}


// ============================================
// FILTER
// ============================================

function filterSuggestions() {

    const search =
        document.getElementById(
            "searchSuggestions"
        ).value
            .trim()
            .toLowerCase();


    const category =
        document.getElementById(
            "categoryFilter"
        ).value;


    const status =
        document.getElementById(
            "statusFilter"
        ).value;


    let filtered =
        allSuggestions.filter(
            function (item) {

                const matchesSearch =
                    !search ||
                    String(
                        item.subject || ""
                    )
                    .toLowerCase()
                    .includes(search)
                    ||
                    String(
                        item.suggestion || ""
                    )
                    .toLowerCase()
                    .includes(search)
                    ||
                    String(
                        item.suggestion_number || ""
                    )
                    .toLowerCase()
                    .includes(search);


                const matchesCategory =
                    !category ||
                    item.category === category;


                const matchesStatus =
                    !status ||
                    item.status === status;


                return (
                    matchesSearch &&
                    matchesCategory &&
                    matchesStatus
                );

            }
        );


    renderSuggestions(
        filtered
    );

}


// ============================================
// RENDER
// ============================================

function renderSuggestions(
    suggestions
) {

    const tbody =
        document.getElementById(
            "suggestionsBody"
        );


    if (!suggestions.length) {

        tbody.innerHTML = `
            <tr>
                <td colspan="7">

                    <div class="empty-state">

                        <div class="empty-state-icon">
                            💡
                        </div>

                        <div>
                            No suggestions found.
                        </div>

                    </div>

                </td>
            </tr>
        `;

        return;

    }


    tbody.innerHTML =
        suggestions
            .map(
                function (item) {

                    const date =
                        formatDate(
                            item.created_at
                        );


                    const reference =
                        item.suggestion_number ||
                        createSuggestionNumber(
                            item.id
                        );


                    const department =
                        item.department ||
                        "Not provided";


                    return `

                        <tr>

                            <td>
                                <span class="reference">
                                    ${escapeHtml(reference)}
                                </span>
                            </td>


                            <td>

                                <div class="subject-cell">
                                    ${escapeHtml(
                                        item.subject || "-"
                                    )}
                                </div>

                            </td>


                            <td>
                                ${escapeHtml(
                                    item.category || "-"
                                )}
                            </td>


                            <td>
                                ${escapeHtml(
                                    department
                                )}
                            </td>


                            <td>
                                ${date}
                            </td>


                            <td>

                                ${getStatusBadge(
                                    item.status
                                )}

                            </td>


                            <td>

                                <button
                                    class="view-btn"
                                    onclick="viewSuggestion(${item.id})">

                                    View

                                </button>

                            </td>

                        </tr>

                    `;

                }
            )
            .join("");

}


// ============================================
// VIEW SUGGESTION
// ============================================

function viewSuggestion(id) {

    currentSuggestion =
        allSuggestions.find(
            function (item) {

                return String(item.id) ===
                       String(id);

            }
        );


    if (!currentSuggestion) {

        alert(
            "Suggestion could not be found."
        );

        return;

    }


    document.getElementById(
        "modalReference"
    ).textContent =
        currentSuggestion.suggestion_number ||
        createSuggestionNumber(
            currentSuggestion.id
        );


    document.getElementById(
        "modalSubject"
    ).textContent =
        currentSuggestion.subject ||
        "-";


    document.getElementById(
        "modalCategory"
    ).textContent =
        currentSuggestion.category ||
        "-";


    document.getElementById(
        "modalDepartment"
    ).textContent =
        currentSuggestion.department ||
        "Not provided";


    document.getElementById(
        "modalDate"
    ).textContent =
        formatDate(
            currentSuggestion.created_at
        );


    document.getElementById(
        "modalSuggestion"
    ).textContent =
        currentSuggestion.suggestion ||
        "-";


    document.getElementById(
        "modalComment"
    ).value =
        currentSuggestion.management_comment ||
        "";


    document.getElementById(
        "modalStatus"
    ).value =
        currentSuggestion.status ||
        "New";


    document.getElementById(
        "suggestionModal"
    ).classList.add(
        "active"
    );

}


// ============================================
// CLOSE MODAL
// ============================================

function closeSuggestionModal() {

    document.getElementById(
        "suggestionModal"
    ).classList.remove(
        "active"
    );


    currentSuggestion =
        null;

}


// ============================================
// UPDATE SUGGESTION
// ============================================

async function updateSuggestion() {

    if (!currentSuggestion) {

        return;

    }


    const status =
        document.getElementById(
            "modalStatus"
        ).value;


    const comment =
        document.getElementById(
            "modalComment"
        ).value.trim();


    try {

        // ====================================
        // GET CURRENT USER
        // ====================================

        const {
            data: {
                user
            }
        } =
            await supabaseClient
                .auth
                .getUser();


        if (!user) {

            alert(
                "Your session has expired."
            );

            window.location.href =
                "index.html";

            return;

        }


        // ====================================
        // UPDATE
        // ====================================

        const {
            error
        } =
            await supabaseClient
                .from("suggestions")
                .update({

                    status:
                        status,

                    management_comment:
                        comment || null,

                    reviewed_by:
                        user.id,

                    reviewed_at:
                        new Date().toISOString()

                })
                .eq(
                    "id",
                    currentSuggestion.id
                );


        if (error) {

            console.error(
                "Update suggestion error:",
                error
            );

            alert(
                "Unable to update suggestion.\n\n" +
                error.message
            );

            return;

        }


        alert(
            "Suggestion updated successfully."
        );


        closeSuggestionModal();


        loadSuggestions();

    }

    catch (error) {

        console.error(error);

        alert(
            "An unexpected error occurred."
        );

    }

}


// ============================================
// STATUS BADGE
// ============================================

function getStatusBadge(
    status
) {

    const safeStatus =
        status || "New";


    let className =
        "status-new";


    if (
        safeStatus ===
        "Under Review"
    ) {

        className =
            "status-review";

    }

    else if (
        safeStatus ===
        "In Progress"
    ) {

        className =
            "status-progress";

    }

    else if (
        safeStatus ===
        "Implemented"
    ) {

        className =
            "status-implemented";

    }

    else if (
        safeStatus ===
        "Rejected"
    ) {

        className =
            "status-rejected";

    }


    return `
        <span class="status-badge ${className}">
            ${escapeHtml(safeStatus)}
        </span>
    `;

}


// ============================================
// CREATE SUGGESTION NUMBER
// ============================================

function createSuggestionNumber(
    id
) {

    return "SUG-" +
        String(id).padStart(
            4,
            "0"
        );

}


// ============================================
// FORMAT DATE
// ============================================

function formatDate(
    date
) {

    if (!date) {

        return "-";

    }


    const d =
        new Date(date);


    if (Number.isNaN(
        d.getTime()
    )) {

        return "-";

    }


    return d.toLocaleDateString(
        "en-NG",
        {
            year: "numeric",
            month: "short",
            day: "numeric"
        }
    );

}


// ============================================
// ESCAPE HTML
// ============================================

function escapeHtml(
    value
) {

    return String(value ?? "")
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


// ============================================
// CLOSE MODAL WHEN CLICKING OUTSIDE
// ============================================

document.addEventListener(
    "click",
    function (event) {

        const modal =
            document.getElementById(
                "suggestionModal"
            );


        if (
            event.target === modal
        ) {

            closeSuggestionModal();

        }

    }
);


// ============================================
// AUTO REFRESH
// ============================================

setInterval(
    function () {

        if (
            document.visibilityState ===
            "visible"
        ) {

            loadSuggestions();

        }

    },
    60000
);