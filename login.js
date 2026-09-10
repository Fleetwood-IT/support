// =====================================================
// FLEETWOOD IT SUPPORT
// LOGIN SYSTEM
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
// ELEMENTS
// =====================================================

const loginForm =
    document.getElementById("loginForm");

const emailInput =
    document.getElementById("email");

const passwordInput =
    document.getElementById("password");

const loginButton =
    document.getElementById("loginButton");

const errorMessage =
    document.getElementById("errorMessage");

const itLoginType =
    document.getElementById("itLoginType");

const managerLoginType =
    document.getElementById("managerLoginType");

let selectedRole = "IT";


// =====================================================
// ROLE SELECTION
// =====================================================

itLoginType.addEventListener("click", function () {

    selectedRole = "IT";

    itLoginType.classList.add("active");
    managerLoginType.classList.remove("active");

    loginButton.textContent =
        "Login to IT Support";

});


managerLoginType.addEventListener("click", function () {

    selectedRole = "Manager";

    managerLoginType.classList.add("active");
    itLoginType.classList.remove("active");

    loginButton.textContent =
        "Login as Manager";

});


// =====================================================
// ERROR MESSAGE
// =====================================================

function showError(message) {

    errorMessage.textContent = message;
    errorMessage.style.display = "block";

}


// =====================================================
// LOGIN
// =====================================================

loginForm.addEventListener("submit", async function (event) {

    event.preventDefault();

    errorMessage.style.display = "none";

    const email =
        emailInput.value.trim();

    const password =
        passwordInput.value;


    if (!email || !password) {

        showError(
            "Please enter your email and password."
        );

        return;

    }


    loginButton.disabled = true;
    loginButton.textContent = "Signing in...";


    try {

        // =================================================
        // SIGN IN WITH SUPABASE
        // =================================================

        const { data, error } =
            await supabaseClient.auth.signInWithPassword({
                email: email,
                password: password
            });


        if (error) {

            console.error("Login error:", error);

            showError(error.message);

            return;

        }


        if (!data || !data.user) {

            showError(
                "Unable to identify your account."
            );

            return;

        }


        // =================================================
        // GET USER PROFILE / ROLE
        // =================================================

        const { data: profile, error: profileError } =
            await supabaseClient
                .from("user_profiles")
                .select("*")
                .eq("id", data.user.id)
                .single();


        if (profileError) {

            console.error(
                "Profile error:",
                profileError
            );

            await supabaseClient.auth.signOut();

            showError(
                "Your account has not been assigned a system role."
            );

            return;

        }


        if (!profile) {

            await supabaseClient.auth.signOut();

            showError(
                "No system profile was found for this account."
            );

            return;

        }


        // =================================================
        // CHECK ROLE
        // =================================================

        const actualRole =
            String(profile.role || "")
                .trim()
                .toLowerCase();

        const expectedRole =
            selectedRole
                .trim()
                .toLowerCase();


        if (actualRole !== expectedRole) {

            await supabaseClient.auth.signOut();

            showError(
                "This account does not have permission to access this portal."
            );

            return;

        }


        // =================================================
        // SAVE LOGIN INFORMATION
        // =================================================

        localStorage.setItem(
            "fleetwoodRole",
            profile.role
        );

        localStorage.setItem(
            "fleetwoodUserName",
            profile.full_name ||
            data.user.email
        );


        // =================================================
        // REDIRECT
        // =================================================

        if (actualRole === "manager") {

            window.location.href =
                "manager.html";

        } else {

            window.location.href =
                "dashboard.html";

        }

    }

    catch (error) {

        console.error(
            "Unexpected login error:",
            error
        );

        showError(
            "An unexpected login error occurred. Please try again."
        );

    }

    finally {

        loginButton.disabled = false;

        loginButton.textContent =
            selectedRole === "Manager"
                ? "Login as Manager"
                : "Login to IT Support";

    }

});