# A3 Health Card

A3 Health Card is a Flask-based web application prototype that demonstrates an **A3 (Accessible, Affordable, Accountable) health card ecosystem**. It focuses on how different stakeholders (patients, hospitals, blood banks, pharmacies, insurers, admins, etc.) can log in or sign up into a unified health platform.

This project currently implements the landing page, login flow for multiple user types, and separate signup pages for each major stakeholder.

---

## 1. Project Overview

### Goal
The goal of this project is to design and prototype a **multi-stakeholder health card system** where:

- Patients/clients can access their health card.
- Hospitals and doctors can log in to view/update information.
- Blood banks and donors/recipients can connect.
- Pharmacies, insurance companies, MNCs, and medical colleges can participate in the ecosystem.
- District/Divisional/State/National/Global admins can manage the system at different levels.

The UI reflects the A3 vision:

- **Accessible** – any stakeholder can access the system from the web portal.
- **Affordable** – conceptually supports efficient and low-cost services.
- **Accountable** – encourages transparency in healthcare data and processes.

---

## 2. Tech Stack

**Backend**
- Python 3
- [Flask 3.0.0](https://flask.palletsprojects.com/) – lightweight web framework

**Frontend**
- HTML5 templates using Jinja2 (Flask templating)
- [Bootstrap 5.3.3](https://getbootstrap.com/) CDN for UI components and grid system
- Custom CSS in `static/styles.css`
- Theme/variables and design system in `static/theme.css`

**Project structure**

```text
A3_Health_Card/
├─ app.py                # Main Flask application
├─ requirements.txt      # Python dependencies
├─ static/
│  ├─ styles.css         # Custom styling
│  └─ theme.css          # Theme, colors, layout helpers
└─ templates/
   ├─ base.html          # Base layout with header/footer
   ├─ index.html         # Landing page with A3 concept & navigation
   ├─ login.html         # Login page for all user types
   ├─ signup_client.html
   ├─ signup_hospital_doctor.html
   ├─ signup_blood_bank.html
   ├─ signup_blood_donor_recipient.html
   ├─ signup_organ_donor_recipient.html
   ├─ signup_pharmacy.html
   ├─ signup_mnc.html
   ├─ signup_insurance_company.html
   ├─ signup_medical_colleges.html
   └─ signup_admin.html  # Reused for all admin levels
```

> Note: The signup templates are separate for each user type to support different fields and flows.

---

## 3. Features Implemented So Far

### 3.1 Flask Application (`app.py`)

- Created a Flask app instance:
  - `app = Flask(__name__)`

- Defined a mapping of **user_type → display name** in `USER_TYPE_DISPLAY_NAMES`:
  - `client`
  - `hospital_doctor`
  - `blood_bank`
  - `blood_donor_recipient`
  - `organ_donor_recipient`
  - `pharmacy`
  - `mnc`
  - `insurance_company`
  - `medical_colleges`
  - `district_admin`, `divisional_admin`, `state_admin`, `national_admin`, `global_admin`

- Defined a mapping of **user_type → signup template** in `SIGNUP_TEMPLATES`:
  - Example: `client → signup_client.html`, `hospital_doctor → signup_hospital_doctor.html`, etc.
  - All admin types reuse `signup_admin.html`.

- Implemented a helper function:
  - `get_display_name(user_type: str) -> str` – returns a user-friendly name for each user type.

- Implemented routes:

  1. **Home route** – `GET /`
     - Function: `index()`
     - Renders `templates/index.html`.
     - Shows:
       - Navbar with **Login** dropdown for all user roles.
       - Hero carousel with A3 messaging.
       - A3 cards (Accessible, Affordable, Accountable).
       - Team section with an auto-scrolling team carousel.

  2. **Login route** – `GET /login/<user_type>`
     - Function: `login(user_type)`
     - Uses `get_display_name` to show readable role names.
     - Calculates `signup_url` using `url_for('signup', user_type=user_type)` **only if** that `user_type` has a signup template.
     - Renders `templates/login.html` with:
       - `user_type`
       - `display_name`
       - `signup_url` (or `None`)

  3. **Signup route** – `GET /signup/<user_type>`
     - Function: `signup(user_type)`
     - Uses `SIGNUP_TEMPLATES` to decide which signup page to load.
     - If a template exists:
       - Renders the correct `signup_*.html` with `user_type` and `display_name`.
     - If no template exists for that user type:
       - Redirects back to the corresponding `/login/<user_type>`.

- Currently the routes are **UI-only**:
  - The login and signup forms are front-end forms (no database or form submission handling yet).
  - This is appropriate for a **UI prototype** stage.

### 3.2 Templates

#### `index.html`

- Includes:
  - Bootstrap CDN, `theme.css`, and `styles.css`.
  - A navbar with:
    - Links to `#home`, `#about`, `#about-card`, `#blog`.
    - A **Login** dropdown with all user types, each calling `url_for('login', user_type='...')`.
    - An **Emergency Login** button anchor (placeholder for future emergency flow).

- Hero section:
  - Created a **Bootstrap carousel** with 2 slides.
  - Each slide has:
    - Background image.
    - Title and text (health-focused messaging).
    - “Get Started” button linking to the A3 section.

- A3 section:
  - Three cards: **Accessible**, **Affordable**, **Accountable**.
  - Each card has an image, title, and short description.

- Team section:
  - Horizontally scrolling team cards.
  - Each card has a photo, name, and role.
  - The track is styled to auto-scroll, simulating an infinite carousel.

#### `login.html`

- Uses Bootstrap + your theme files.
- Header navbar similar to `index.html`, with links back to `index` and login dropdown.
- Login card:
  - Shows dynamic title: **“Login as {{ display_name }}”**.
  - Fields:
    - UID (required)
    - Email (required)
    - Password (required)
    - Remember me checkbox
  - A **Login** button (currently front-end only).
  - “Forgot Password?” link (placeholder).
  - If `signup_url` is provided, shows a **Create a New Account** button that takes the user to the correct signup page.

#### `base.html`

- Reusable layout template for other pages.
- Contains:
  - Simple header with logo and navigation.
  - Blocks: `title`, `hero`, `content` to be overridden in child templates.
  - Footer with “Made with care” badge and copyright.

### 3.3 Static Styles (`static/styles.css`, `static/theme.css`)

- `theme.css` defines the **design system**:
  - Color variables (e.g., primary red, neutrals).
  - Typography styles.
  - Base layout components for navbar, footer, badges, etc.

- `styles.css` applies more detailed UI styling:
  - Custom hero section, carousel styling.
  - A3 cards layout and hover states.
  - Team carousel track and member card styling.
  - Login form spacing, margins, and responsive tweaks.

*(Exact CSS rules live in the files, but overall, you have implemented a consistent theme and layout for the app.)*

---

## 4. How to Run the Project Locally

> Prerequisites:
> - Python 3 installed
> - `pip` available in your PATH

1. **Create and activate a virtual environment** (recommended)

   ```bash
   python -m venv venv
   # On Windows (PowerShell)
   .\venv\Scripts\Activate.ps1
   # On Windows (CMD)
   .\venv\Scripts\activate.bat
   # On Linux/macOS
   source venv/bin/activate
   ```

2. **Install dependencies**

   ```bash
   pip install -r requirements.txt
   ```

3. **Run the Flask app**

   ```bash
   python app.py
   ```

4. **Open the app in your browser**

   Go to: `http://127.0.0.1:5000/` or `http://localhost:5000/`

---

## 5. Backend Integration (NEW)

### Database & Authentication
The application now includes complete backend functionality:

**Features Implemented:**
- SQLite database with SQLAlchemy ORM
- User authentication with Flask-Login
- Email OTP verification via SMTP
- Secure password hashing
- Session management
- Multi-user type support

### UID Format
**16-Digit Unique ID (UID):**
- Format: `CCC` + 13 random digits
- `CCC` = Country code (e.g., 091 for India)
- Example: `0913456789012345`
- Generated automatically upon registration
- Sent to user's registered email
- Required for login along with email and password

### Signup Flow:
1. User fills signup form for their user type
2. Backend validates data
3. Generates 6-digit OTP (valid for 10 minutes)
4. Sends OTP to user's email via SMTP
5. User enters OTP to verify email
6. System creates user account with 16-digit UID
7. UID is sent to user's email
8. User can login using UID, email, and password

### Login Flow:
1. User enters their 16-digit UID
2. User enters registered email
3. User enters password
4. System validates credentials
5. User is logged in and redirected to dashboard

### Setup Requirements:
1. Install dependencies: `pip install -r requirements.txt`
2. Configure email settings in `.env` file (copy from `.env.example`)
3. For Gmail: Enable 2FA and generate App Password
4. Run: `python app.py`
5. Access at: http://127.0.0.1:5000/

See `SETUP_INSTRUCTIONS.md` for detailed setup guide.

## 6. How the Routes Work (Summary)

- `/`
  - Landing page with A3 explanation, hero banner, and navigation.
  - Login dropdown links to `/login/<user_type>` for each role.

- `/login/<user_type>`
  - Renders login form with dynamic title and optional signup link.

- `/signup/<user_type>`
  - Renders user-specific signup page if a template is defined.
  - If not defined, redirects back to `/login/<user_type>`.

---

## 6. Work Done by Me (for Mentor/Documentation)

You can present this section directly to your mentor to explain what you have done so far:

1. **Set up Flask project**
   - Created `app.py` and initialized a Flask application.
   - Configured `requirements.txt` with Flask dependency.

2. **Designed multi-role system**
   - Defined a clear list of user roles (clients, doctors, banks, donors, admins, etc.).
   - Created mapping structures for user display names and signup templates.

3. **Implemented core routes**
   - Home page route (`/`) rendering `index.html`.
   - Login route (`/login/<user_type>`) with dynamic `display_name` and conditional `signup_url`.
   - Signup route (`/signup/<user_type>`) that selects the correct HTML template or redirects back to login.

4. **Built landing page UI (`index.html`)**
   - Navbar with all user types in the Login dropdown.
   - Hero carousel section with health-focused imagery and text.
   - A3 concept section (Accessible, Affordable, Accountable) using cards.
   - Team section with horizontally scrolling team members.

5. **Built login page UI (`login.html`)**
   - Responsive login card layout using Bootstrap.
   - Dynamic heading based on user type.
   - Form fields for UID, email, password, and remember-me.
   - Placeholder links for Forgot Password and Create New Account.

6. **Created multiple signup pages**
   - Separate templates for each major role:
     - Client
     - Hospital/Doctor
     - Blood Bank
     - Blood Donor/Recipient
     - Organ Donor/Recipient
     - Pharmacy
     - MNC
     - Insurance Company
     - Medical Colleges
     - Admin levels (shared template)
   - These templates can hold custom forms and fields for each role.

7. **Implemented consistent styling**
   - Defined a shared theme in `theme.css`.
   - Added custom UI polish in `styles.css` for hero, cards, team carousel, and forms.

8. **Prepared for future backend work**
   - Routes and templates are structured in a way that you can later:
     - Add form handling with `POST` methods.
     - Connect to a database for user accounts and health records.
     - Implement authentication, authorization, and dashboards for each role.

---

## 7. Next Possible Steps

For future work, you could:

- Add **form handling** for login and signup (Flask `POST` routes).
- Integrate a **database** (e.g., SQLite/PostgreSQL) to store users and health card data.
- Implement **authentication** (sessions, password hashing).
- Build **role-specific dashboards** (patient view, hospital view, admin panels, etc.).
- Add **emergency login flow** connected to emergency data access.
- Improve accessibility (ARIA attributes, keyboard navigation, contrast checks).

---

## 8. How to Explain This Project in Your Own Words

When you talk to your mentor, you can say something like:

> "I built a Flask-based prototype for an A3 Health Card system. It has a landing page with the A3 concept (Accessible, Affordable, Accountable), a multi-role login flow, and separate signup pages for different stakeholders like clients, hospitals, blood banks, pharmacies, insurance companies, and multiple admin levels. Right now, it focuses mainly on the frontend UI and routing. I have structured the code so that I can later add real authentication, database connections, and dashboards for each role."

You can customize the above explanation based on what you add next.