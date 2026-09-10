// ============================================================
// FLEETWOOD IT SUPPORT
// STAFF PORTAL
// TICKET SUBMISSION + TRACKING + REMARKS + REOPEN
// ANONYMOUS SUGGESTION BOX
// ============================================================


// ============================================================
// SUPABASE CONFIGURATION
// ============================================================

const SUPABASE_URL =
    "https://xcfobyusisjbfbnsohjz.supabase.co";

const SUPABASE_ANON_KEY =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhjZm9ieXVzaXNqYmZibnNvaGp6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg3ODc5NzEsImV4cCI6MjEwNDM2Mzk3MX0.ATSzb3RKqGDNPEL_YdORwBzsQJPMIqONzJJaG7LW9YU";

const supabaseClient =
    supabase.createClient(
        SUPABASE_URL,
        SUPABASE_ANON_KEY
    );


// ============================================================
// GET IT REQUEST ELEMENTS
// ============================================================

const form =
    document.getElementById("staffRequestForm");

const requestType =
    document.getElementById("requestType");

const requestTypeBadge =
    document.getElementById("requestTypeBadge");

const equipmentSection =
    document.getElementById("equipmentSection");

const formPanel =
    document.getElementById("requestFormPanel");

const successBox =
    document.getElementById("successBox");

const successTicketNumber =
    document.getElementById("successTicketNumber");

const successTrackingCode =
    document.getElementById("successTrackingCode");

const submitButton =
    document.getElementById("submitButton");

const clearFormButton =
    document.getElementById("clearForm");


// ============================================================
// SUCCESS BOX TICKET-ONLY ELEMENTS
// ============================================================

const ticketSecurityNotice =
    document.getElementById("ticketSecurityNotice");

const ticketNumbersSection =
    document.getElementById("ticketNumbersSection");

const trackMyTicketButton =
    document.getElementById("trackMyTicketButton");


// ============================================================
// SUGGESTION ELEMENTS
// ============================================================

const suggestionFormPanel =
    document.getElementById("suggestionFormPanel");

const suggestionForm =
    document.getElementById("suggestionForm");

const suggestionSubmitButton =
    document.getElementById("suggestionSubmitButton");


// ============================================================
// TRACKING ELEMENTS
// ============================================================

const trackingFormPanel =
    document.getElementById("trackingFormPanel");

const ticketTrackingForm =
    document.getElementById("ticketTrackingForm");

const trackingTicketNumber =
    document.getElementById("trackingTicketNumber");

const trackingCodeInput =
    document.getElementById("trackingCodeInput");

const trackTicketButton =
    document.getElementById("trackTicketButton");

const trackResult =
    document.getElementById("trackResult");

const trackedTicketTitle =
    document.getElementById("trackedTicketTitle");

const trackedTicketStatus =
    document.getElementById("trackedTicketStatus");

const trackedCategory =
    document.getElementById("trackedCategory");

const trackedPriority =
    document.getElementById("trackedPriority");

const trackedCreatedAt =
    document.getElementById("trackedCreatedAt");

const trackedUpdatedAt =
    document.getElementById("trackedUpdatedAt");

const trackedSubject =
    document.getElementById("trackedSubject");

const trackedITUpdate =
    document.getElementById("trackedITUpdate");

const staffTrackingRemark =
    document.getElementById("staffTrackingRemark");

const submitTrackingRemark =
    document.getElementById("submitTrackingRemark");

const confirmResolution =
    document.getElementById("confirmResolution");

const reopenTicketButton =
    document.getElementById("reopenTicket");


// ============================================================
// CURRENT TRACKED TICKET
// ============================================================

let currentTrackedTicket = null;


// ============================================================
// SELECT REQUEST TYPE
// ============================================================

function selectRequestType(type) {

    if (suggestionFormPanel) {
        suggestionFormPanel.classList.remove("active");
        suggestionFormPanel.style.display = "none";
    }

    if (trackingFormPanel) {
        trackingFormPanel.classList.remove("active");
        trackingFormPanel.style.display = "none";
    }

    if (trackResult) {
        trackResult.classList.remove("active");
        trackResult.style.display = "none";
    }

    if (successBox) {
        successBox.style.display = "none";
    }

    requestType.value = type;

    formPanel.classList.add("active");
    formPanel.style.display = "block";

    if (type === "Problem") {

        requestTypeBadge.textContent =
            "REPORT IT PROBLEM";

    }
    else if (type === "Equipment") {

        requestTypeBadge.textContent =
            "EQUIPMENT REQUEST";

    }
    else if (type === "Repair") {

        requestTypeBadge.textContent =
            "DEVICE REPAIR";

    }
    else if (type === "Replacement") {

        requestTypeBadge.textContent =
            "LAPTOP REPLACEMENT";

    }


    if (type === "Equipment") {

        equipmentSection.style.display =
            "block";

    }
    else {

        equipmentSection.style.display =
            "none";

        clearEquipmentSelection();

    }


    const reasonSelect =
        document.getElementById("requestReason");


    if (type === "Replacement") {

        reasonSelect.value =
            "Replacement needed";

    }
    else if (type === "Repair") {

        reasonSelect.value =
            "Faulty equipment";

    }
    else if (type === "Equipment") {

        reasonSelect.value =
            "New equipment needed";

    }
    else {

        reasonSelect.value =
            "";

    }


    setTimeout(function () {

        formPanel.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });

    }, 100);
}


// ============================================================
// OPEN TRACKING
// ============================================================

function openTicketTracking() {

    formPanel.classList.remove("active");
    formPanel.style.display = "none";

    if (suggestionFormPanel) {

        suggestionFormPanel.classList.remove("active");
        suggestionFormPanel.style.display = "none";

    }

    if (successBox) {

        successBox.style.display = "none";

    }

    if (trackResult) {

        trackResult.classList.remove("active");
        trackResult.style.display = "none";

    }

    trackingFormPanel.classList.add("active");
    trackingFormPanel.style.display = "block";

    setTimeout(function () {

        trackingFormPanel.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });

    }, 100);
}


// ============================================================
// OPEN TRACKING FROM SUCCESS PAGE
// ============================================================

function openTicketTrackingFromSuccess() {

    const savedTicketNumber =
        successTicketNumber
            ? successTicketNumber.textContent.trim()
            : "";

    const savedTrackingCode =
        successTrackingCode
            ? successTrackingCode.textContent.trim()
            : "";


    successBox.style.display =
        "none";

    formPanel.classList.remove("active");
    formPanel.style.display = "none";

    if (suggestionFormPanel) {

        suggestionFormPanel.classList.remove("active");
        suggestionFormPanel.style.display = "none";

    }


    trackingFormPanel.classList.add("active");
    trackingFormPanel.style.display = "block";


    if (
        savedTicketNumber &&
        savedTicketNumber.startsWith("IT-")
    ) {

        trackingTicketNumber.value =
            savedTicketNumber;

    }


    if (
        savedTrackingCode &&
        savedTrackingCode.startsWith("FW-")
    ) {

        trackingCodeInput.value =
            savedTrackingCode;

    }


    setTimeout(function () {

        trackingFormPanel.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });

    }, 100);

}


// ============================================================
// CLOSE TRACKING
// ============================================================

function closeTicketTracking() {

    if (ticketTrackingForm) {
        ticketTrackingForm.reset();
    }

    if (trackResult) {

        trackResult.classList.remove("active");
        trackResult.style.display = "none";

    }

    currentTrackedTicket =
        null;

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}


// ============================================================
// OPEN SUGGESTION BOX
// ============================================================

function openSuggestionBox() {

    formPanel.classList.remove("active");
    formPanel.style.display = "none";

    if (trackingFormPanel) {

        trackingFormPanel.classList.remove("active");
        trackingFormPanel.style.display = "none";

    }

    if (trackResult) {

        trackResult.classList.remove("active");
        trackResult.style.display = "none";

    }

    successBox.style.display =
        "none";

    suggestionFormPanel.classList.add("active");
    suggestionFormPanel.style.display = "block";


    setTimeout(function () {

        suggestionFormPanel.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });

    }, 100);
}


// ============================================================
// CLOSE SUGGESTION BOX
// ============================================================

function closeSuggestionBox() {

    suggestionForm.reset();

    suggestionFormPanel.classList.remove("active");
    suggestionFormPanel.style.display = "none";

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}


// ============================================================
// CLEAR EQUIPMENT
// ============================================================

function clearEquipmentSelection() {

    const equipmentRadios =
        document.querySelectorAll(
            'input[name="equipment"]'
        );

    equipmentRadios.forEach(function (radio) {

        radio.checked = false;

    });
}


// ============================================================
// GET SELECTED EQUIPMENT
// ============================================================

function getSelectedEquipment() {

    const selected =
        document.querySelector(
            'input[name="equipment"]:checked'
        );

    return selected
        ? selected.value
        : "";
}


// ============================================================
// GET CATEGORY
// ============================================================

function getCategory(type) {

    switch (type) {

        case "Problem":
            return "IT Support";

        case "Equipment":
            return "Equipment Request";

        case "Repair":
            return "Repair";

        case "Replacement":
            return "Laptop Replacement";

        default:
            return "IT Support";

    }
}


// ============================================================
// CREATE TICKET NUMBER
// ============================================================

function createTicketNumber(id) {

    return "IT-" +
        String(id).padStart(3, "0");

}


// ============================================================
// CREATE PRIVATE TRACKING CODE
// ============================================================

function createTrackingCode() {

    const characters =
        "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

    let code = "FW-";

    for (let i = 0; i < 5; i++) {

        const randomIndex =
            Math.floor(
                Math.random() * characters.length
            );

        code +=
            characters[randomIndex];

    }

    return code;

}


// ============================================================
// FORMAT DATE
// ============================================================

function formatDate(dateValue) {

    if (!dateValue) {
        return "-";
    }

    const date =
        new Date(dateValue);

    if (isNaN(date.getTime())) {
        return "-";
    }

    return date.toLocaleString(
        "en-NG",
        {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        }
    );

}


// ============================================================
// GET TICKET ID FROM TICKET NUMBER
// ============================================================

function getTicketId(ticketNumber) {

    const cleaned =
        ticketNumber
            .trim()
            .toUpperCase();

    if (!cleaned.startsWith("IT-")) {
        return null;
    }

    const numberPart =
        cleaned.replace("IT-", "");

    const id =
        parseInt(numberPart, 10);

    if (
        isNaN(id) ||
        id <= 0
    ) {

        return null;

    }

    return id;

}


// ============================================================
// GET IT UPDATE
// ============================================================

function getITUpdate(ticket) {

    if (
        ticket.manager_comment &&
        ticket.manager_comment.trim()
    ) {

        return ticket.manager_comment;

    }

    if (
        ticket.it_comment &&
        ticket.it_comment.trim()
    ) {

        return ticket.it_comment;

    }

    if (
        ticket.comment &&
        ticket.comment.trim()
    ) {

        return ticket.comment;

    }

    if (
        ticket.resolution &&
        ticket.resolution.trim()
    ) {

        return ticket.resolution;

    }

    return "No update has been provided yet.";

}


// ============================================================
// SET STATUS DISPLAY
// ============================================================

function setStatusDisplay(status) {

    const cleanStatus =
        status || "Open";

    trackedTicketStatus.textContent =
        cleanStatus;


    const lower =
        cleanStatus.toLowerCase();


    if (
        lower.includes("closed") ||
        lower.includes("resolved")
    ) {

        trackedTicketStatus.style.background =
            "#dcfce7";

        trackedTicketStatus.style.color =
            "#15803d";

    }
    else if (
        lower.includes("pending") ||
        lower.includes("reopen")
    ) {

        trackedTicketStatus.style.background =
            "#fef3c7";

        trackedTicketStatus.style.color =
            "#92400e";

    }
    else if (
        lower.includes("critical")
    ) {

        trackedTicketStatus.style.background =
            "#fee2e2";

        trackedTicketStatus.style.color =
            "#b91c1c";

    }
    else {

        trackedTicketStatus.style.background =
            "#eff6ff";

        trackedTicketStatus.style.color =
            "#2563eb";

    }

}


// ============================================================
// SHOW TRACKING RESULT
// ============================================================

function showTrackingResult(ticket) {

    currentTrackedTicket =
        ticket;


    const ticketNumber =
        createTicketNumber(ticket.id);


    trackedTicketTitle.textContent =
        "Ticket " + ticketNumber;


    setStatusDisplay(
        ticket.status
    );


    trackedCategory.textContent =
        ticket.category || "IT Support";


    trackedPriority.textContent =
        ticket.priority || "Normal";


    trackedCreatedAt.textContent =
        formatDate(ticket.created_at);


    trackedUpdatedAt.textContent =
        formatDate(
            ticket.updated_at ||
            ticket.last_staff_update_at ||
            ticket.created_at
        );


    trackedSubject.textContent =
        ticket.subject || "-";


    trackedITUpdate.textContent =
        getITUpdate(ticket);


    staffTrackingRemark.value =
        "";


    trackResult.classList.add(
        "active"
    );

    trackResult.style.display =
        "block";


    setTimeout(function () {

        trackResult.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });

    }, 100);

}


// ============================================================
// TRACK TICKET
// ============================================================

ticketTrackingForm.addEventListener(
    "submit",
    async function (event) {

        event.preventDefault();


        const ticketNumber =
            trackingTicketNumber.value
                .trim()
                .toUpperCase();


        const trackingCode =
            trackingCodeInput.value
                .trim()
                .toUpperCase();


        if (!ticketNumber) {

            alert(
                "Please enter your ticket number."
            );

            return;

        }


        if (!trackingCode) {

            alert(
                "Please enter your private tracking code."
            );

            return;

        }


        const ticketId =
            getTicketId(ticketNumber);


        if (!ticketId) {

            alert(
                "Invalid ticket number.\n\n" +
                "Please enter a ticket number such as IT-104."
            );

            return;

        }


        trackTicketButton.disabled =
            true;

        trackTicketButton.textContent =
            "Checking...";


        try {

            const {
                data,
                error
            } =
                await supabaseClient
                    .from("tickets")
                    .select(`
                        id,
                        requester_name,
                        department,
                        category,
                        priority,
                        subject,
                        status,
                        description,
                        manager_comment,
                        created_at,
                        updated_at,
                        staff_remark,
                        reopen_reason,
                        reopen_requested_at,
                        last_staff_update_at,
                        tracking_code
                    `)
                    .eq(
                        "id",
                        ticketId
                    )
                    .eq(
                        "tracking_code",
                        trackingCode
                    )
                    .maybeSingle();


            if (error) {

                console.error(
                    "Ticket tracking error:",
                    error
                );

                alert(
                    "Unable to check your ticket.\n\n" +
                    error.message
                );

                return;

            }


            if (!data) {

                alert(
                    "Ticket not found.\n\n" +
                    "Please check that your ticket number and private tracking code are correct."
                );

                return;

            }


            showTrackingResult(data);

        }

        catch (error) {

            console.error(error);

            alert(
                "An unexpected error occurred while checking your ticket."
            );

        }

        finally {

            trackTicketButton.disabled =
                false;

            trackTicketButton.textContent =
                "🔎 Track Ticket";

        }

    }
);


// ============================================================
// SUBMIT IT TICKET
// ============================================================

form.addEventListener(
    "submit",
    async function (event) {

        event.preventDefault();


        const type =
            requestType.value;


        const name =
            document.getElementById(
                "staffName"
            )
            .value
            .trim();


        const department =
            document.getElementById(
                "staffDepartment"
            )
            .value;


        const priority =
            document.getElementById(
                "staffPriority"
            )
            .value;


        const reason =
            document.getElementById(
                "requestReason"
            )
            .value;


        const subject =
            document.getElementById(
                "staffSubject"
            )
            .value
            .trim();


        const description =
            document.getElementById(
                "staffDescription"
            )
            .value
            .trim();


        const equipment =
            getSelectedEquipment();


        if (!name) {

            alert(
                "Please enter your full name."
            );

            return;

        }


        if (!department) {

            alert(
                "Please select your department."
            );

            return;

        }


        if (
            type === "Equipment" &&
            !equipment
        ) {

            alert(
                "Please select the equipment you are requesting."
            );

            return;

        }


        if (!priority) {

            alert(
                "Please select a priority."
            );

            return;

        }


        if (!reason) {

            alert(
                "Please select the request reason."
            );

            return;

        }


        if (!subject) {

            alert(
                "Please enter a subject."
            );

            return;

        }


        if (!description) {

            alert(
                "Please describe your request."
            );

            return;

        }


        let finalDescription = "";


        finalDescription +=
            "Request Type: " +
            type +
            "\n";


        if (equipment) {

            finalDescription +=
                "Equipment Requested: " +
                equipment +
                "\n";

        }


        finalDescription +=
            "Reason: " +
            reason +
            "\n\n";


        finalDescription +=
            "Staff Description:\n" +
            description;


        const trackingCode =
            createTrackingCode();


        const newTicket = {

            requester_name:
                name,

            department:
                department,

            category:
                getCategory(type),

            priority:
                priority,

            subject:
                subject,

            description:
                finalDescription,

            status:
                "Open",

            tracking_code:
                trackingCode

        };


        submitButton.disabled =
            true;


        submitButton.textContent =
            "Submitting...";


        try {

            const {
                data,
                error
            } =
                await supabaseClient
                    .from("tickets")
                    .insert([newTicket])
                    .select()
                    .single();


            if (error) {

                console.error(
                    "Ticket submission error:",
                    error
                );


                alert(
                    "Unable to submit your request.\n\n" +
                    error.message
                );


                return;

            }


            const ticketNumber =
                createTicketNumber(
                    data.id
                );


            successTicketNumber.className =
                "ticket-number";


            successTicketNumber.textContent =
                ticketNumber;


            if (successTrackingCode) {

                successTrackingCode.textContent =
                    trackingCode;

            }


            document.getElementById(
                "successTitle"
            ).textContent =
                "Request Submitted Successfully";


            document.getElementById(
                "successMessage"
            ).textContent =
                "Your IT support request has been received. Please keep your ticket number and private tracking code safe.";


            // Show ticket-only elements (in case a suggestion hid them earlier)

            if (ticketSecurityNotice) {
                ticketSecurityNotice.style.display = "block";
            }

            if (ticketNumbersSection) {
                ticketNumbersSection.style.display = "block";
            }

            if (trackMyTicketButton) {
                trackMyTicketButton.style.display = "inline-block";
            }


            formPanel.style.display =
                "none";


            suggestionFormPanel.style.display =
                "none";


            if (trackingFormPanel) {

                trackingFormPanel.style.display =
                    "none";

            }


            if (trackResult) {

                trackResult.style.display =
                    "none";

            }


            successBox.style.display =
                "block";


            successBox.scrollIntoView({
                behavior: "smooth",
                block: "start"
            });


            form.reset();


            requestType.value =
                "Problem";


            requestTypeBadge.textContent =
                "REPORT IT PROBLEM";


            equipmentSection.style.display =
                "none";


            clearEquipmentSelection();

        }

        catch (error) {

            console.error(error);


            alert(
                "An unexpected error occurred while submitting your request."
            );

        }

        finally {

            submitButton.disabled =
                false;


            submitButton.textContent =
                "Submit Request";

        }

    }
);


// ============================================================
// CLEAR IT FORM
// ============================================================

clearFormButton.addEventListener(
    "click",
    function () {

        form.reset();


        requestType.value =
            "Problem";


        requestTypeBadge.textContent =
            "REPORT IT PROBLEM";


        equipmentSection.style.display =
            "none";


        clearEquipmentSelection();

    }
);


// ============================================================
// SEND STAFF REMARK
// ============================================================

submitTrackingRemark.addEventListener(
    "click",
    async function () {

        if (!currentTrackedTicket) {

            alert(
                "Please track your ticket first."
            );

            return;

        }


        const remark =
            staffTrackingRemark.value
                .trim();


        if (!remark) {

            alert(
                "Please enter a remark before sending."
            );

            return;

        }


        if (remark.length < 3) {

            alert(
                "Please provide more information in your remark."
            );

            return;

        }


        submitTrackingRemark.disabled =
            true;


        submitTrackingRemark.textContent =
            "Sending...";


        try {

            const {
                error
            } =
                await supabaseClient
                    .from("tickets")
                    .update({

                        staff_remark:
                            remark,

                        last_staff_update_at:
                            new Date().toISOString()

                    })
                    .eq(
                        "id",
                        currentTrackedTicket.id
                    )
                    .eq(
                        "tracking_code",
                        currentTrackedTicket.tracking_code
                    );


            if (error) {

                console.error(
                    "Remark error:",
                    error
                );


                alert(
                    "Unable to send your remark.\n\n" +
                    error.message
                );


                return;

            }


            currentTrackedTicket.staff_remark =
                remark;


            currentTrackedTicket.last_staff_update_at =
                new Date().toISOString();


            trackedUpdatedAt.textContent =
                formatDate(
                    currentTrackedTicket.last_staff_update_at
                );


            staffTrackingRemark.value =
                "";


            alert(
                "Your remark has been sent successfully."
            );

        }

        catch (error) {

            console.error(error);


            alert(
                "An unexpected error occurred while sending your remark."
            );

        }

        finally {

            submitTrackingRemark.disabled =
                false;


            submitTrackingRemark.textContent =
                "💬 Send Remark";

        }

    }
);


// ============================================================
// CONFIRM RESOLVED
// ============================================================

confirmResolution.addEventListener(
    "click",
    async function () {

        if (!currentTrackedTicket) {

            alert(
                "Please track your ticket first."
            );

            return;

        }


        const confirmed =
            confirm(
                "Are you sure your issue has been resolved?\n\n" +
                "Click OK to confirm that the issue is resolved."
            );


        if (!confirmed) {
            return;
        }


        confirmResolution.disabled =
            true;


        confirmResolution.textContent =
            "Updating...";


        try {

            const {
                error
            } =
                await supabaseClient
                    .from("tickets")
                    .update({

                        status:
                            "Resolved",

                        staff_remark:
                            "Staff confirmed that the issue has been resolved.",

                        last_staff_update_at:
                            new Date().toISOString()

                    })
                    .eq(
                        "id",
                        currentTrackedTicket.id
                    )
                    .eq(
                        "tracking_code",
                        currentTrackedTicket.tracking_code
                    );


            if (error) {

                console.error(
                    "Resolution confirmation error:",
                    error
                );


                alert(
                    "Unable to update the ticket.\n\n" +
                    error.message
                );


                return;

            }


            currentTrackedTicket.status =
                "Resolved";


            currentTrackedTicket.staff_remark =
                "Staff confirmed that the issue has been resolved.";


            currentTrackedTicket.last_staff_update_at =
                new Date().toISOString();


            setStatusDisplay(
                "Resolved"
            );


            trackedUpdatedAt.textContent =
                formatDate(
                    currentTrackedTicket.last_staff_update_at
                );


            trackedITUpdate.textContent =
                "You confirmed that this issue has been resolved.";


            alert(
                "Thank you. Your ticket has been marked as resolved."
            );

        }

        catch (error) {

            console.error(error);


            alert(
                "An unexpected error occurred while confirming resolution."
            );

        }

        finally {

            confirmResolution.disabled =
                false;


            confirmResolution.textContent =
                "✓ Confirm Resolved";

        }

    }
);


// ============================================================
// REQUEST REOPEN
// ============================================================

reopenTicketButton.addEventListener(
    "click",
    async function () {

        if (!currentTrackedTicket) {

            alert(
                "Please track your ticket first."
            );

            return;

        }


        const currentStatus =
            (
                currentTrackedTicket.status ||
                ""
            ).toLowerCase();


        if (
            currentStatus !== "closed" &&
            currentStatus !== "resolved"
        ) {

            alert(
                "This ticket does not need to be reopened because it is currently " +
                currentTrackedTicket.status +
                "."
            );

            return;

        }


        const reason =
            prompt(
                "Why do you want this ticket reopened?\n\n" +
                "Please explain what is still not resolved."
            );


        if (!reason) {
            return;
        }


        if (reason.trim().length < 5) {

            alert(
                "Please provide a little more detail about why the ticket needs to be reopened."
            );

            return;

        }


        reopenTicketButton.disabled =
            true;


        reopenTicketButton.textContent =
            "Requesting...";


        try {

            const {
                error
            } =
                await supabaseClient
                    .from("tickets")
                    .update({

                        status:
                            "Reopen Requested",

                        reopen_reason:
                            reason.trim(),

                        reopen_requested_at:
                            new Date().toISOString(),

                        last_staff_update_at:
                            new Date().toISOString()

                    })
                    .eq(
                        "id",
                        currentTrackedTicket.id
                    )
                    .eq(
                        "tracking_code",
                        currentTrackedTicket.tracking_code
                    );


            if (error) {

                console.error(
                    "Reopen request error:",
                    error
                );


                alert(
                    "Unable to request ticket reopening.\n\n" +
                    error.message
                );


                return;

            }


            currentTrackedTicket.status =
                "Reopen Requested";


            currentTrackedTicket.reopen_reason =
                reason.trim();


            currentTrackedTicket.reopen_requested_at =
                new Date().toISOString();


            currentTrackedTicket.last_staff_update_at =
                new Date().toISOString();


            setStatusDisplay(
                "Reopen Requested"
            );


            trackedUpdatedAt.textContent =
                formatDate(
                    currentTrackedTicket.last_staff_update_at
                );


            trackedITUpdate.textContent =
                "Your request to reopen this ticket has been sent to IT for review.";


            alert(
                "Your reopen request has been submitted successfully."
            );

        }

        catch (error) {

            console.error(error);


            alert(
                "An unexpected error occurred while requesting a reopen."
            );

        }

        finally {

            reopenTicketButton.disabled =
                false;


            reopenTicketButton.textContent =
                "🔄 Reopen Ticket";

        }

    }
);


// ============================================================
// SUBMIT ANONYMOUS SUGGESTION
// ============================================================

suggestionForm.addEventListener(
    "submit",
    async function (event) {

        event.preventDefault();


        const category =
            document.getElementById(
                "suggestionCategory"
            ).value;


        const department =
            document.getElementById(
                "suggestionDepartment"
            ).value;


        const subject =
            document.getElementById(
                "suggestionSubject"
            ).value
            .trim();


        const suggestion =
            document.getElementById(
                "suggestionText"
            ).value
            .trim();


        if (!category) {

            alert(
                "Please select a suggestion category."
            );

            return;

        }


        if (!subject) {

            alert(
                "Please enter a subject."
            );

            return;

        }


        if (!suggestion) {

            alert(
                "Please enter your suggestion."
            );

            return;

        }


        if (suggestion.length < 10) {

            alert(
                "Please provide a little more detail about your suggestion."
            );

            return;

        }


        suggestionSubmitButton.disabled =
            true;


        suggestionSubmitButton.textContent =
            "Submitting...";


        try {

            const {
                error
            } =
                await supabaseClient
                    .from("suggestions")
                    .insert([{

                        category:
                            category,

                        department:
                            department || null,

                        subject:
                            subject,

                        suggestion:
                            suggestion,

                        status:
                            "New"

                    }]);


            if (error) {

                console.error(
                    "Suggestion submission error:",
                    error
                );


                alert(
                    "Unable to submit your suggestion.\n\n" +
                    error.message
                );


                return;

            }


            document.getElementById(
                "successTitle"
            ).textContent =
                "Suggestion Submitted Successfully";


            document.getElementById(
                "successMessage"
            ).textContent =
                "Thank you for your suggestion. It has been submitted anonymously.";


            // Hide ticket-only elements — suggestions have no ticket
            // number or tracking code to save

            if (ticketSecurityNotice) {
                ticketSecurityNotice.style.display = "none";
            }

            if (ticketNumbersSection) {
                ticketNumbersSection.style.display = "none";
            }

            if (trackMyTicketButton) {
                trackMyTicketButton.style.display = "none";
            }


            suggestionFormPanel.style.display =
                "none";


            formPanel.style.display =
                "none";


            if (trackingFormPanel) {

                trackingFormPanel.style.display =
                    "none";

            }


            successBox.style.display =
                "block";


            successBox.scrollIntoView({
                behavior: "smooth",
                block: "start"
            });


            suggestionForm.reset();

        }

        catch (error) {

            console.error(error);


            alert(
                "An unexpected error occurred while submitting your suggestion."
            );

        }

        finally {

            suggestionSubmitButton.disabled =
                false;


            suggestionSubmitButton.textContent =
                "Submit Suggestion";

        }

    }
);


// ============================================================
// SUBMIT ANOTHER REQUEST
// ============================================================

function startNewRequest() {

    form.reset();

    suggestionForm.reset();


    requestType.value =
        "Problem";


    requestTypeBadge.textContent =
        "REPORT IT PROBLEM";


    equipmentSection.style.display =
        "none";


    clearEquipmentSelection();


    if (ticketTrackingForm) {
        ticketTrackingForm.reset();
    }


    if (trackResult) {

        trackResult.classList.remove("active");
        trackResult.style.display = "none";

    }


    currentTrackedTicket =
        null;


    // Restore ticket-only elements for the next submission

    if (ticketSecurityNotice) {
        ticketSecurityNotice.style.display = "block";
    }

    if (ticketNumbersSection) {
        ticketNumbersSection.style.display = "block";
    }

    if (trackMyTicketButton) {
        trackMyTicketButton.style.display = "inline-block";
    }


    successBox.style.display =
        "none";


    formPanel.style.display =
        "block";


    suggestionFormPanel.style.display =
        "none";


    if (trackingFormPanel) {

        trackingFormPanel.style.display =
            "none";

    }


    formPanel.classList.add(
        "active"
    );


    formPanel.scrollIntoView({
        behavior: "smooth",
        block: "start"
    });

}


// ============================================================
// BACK TO HOME
// ============================================================
//
// This simply redirects the browser to index.html.
// Update the path below if index.html lives in a different
// folder relative to this staff portal page (e.g. "../index.html").

function backToHome() {

    window.location.href = "index.html";

}