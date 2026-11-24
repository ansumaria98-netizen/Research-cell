# BVM Holy Cross College, Cherpunkal — IRIPGMS
## Institutional Research, Innovation and Project Governance Management System
### Modules: Access Control • Department Governance • Project Submission • RIC Review • Similarity Checking

An institutional-grade, full-page research management web platform designed for **Bishop Vayalil Memorial Holy Cross College, Cherpunkal, Kottayam, Kerala** (Affiliated to Mahatma Gandhi University, NAAC Re-Accredited, ESTD 1995).

Built with **Node.js, Express.js, React.js, and MongoDB** (Zero Vite, No Bundlers, Single-Server Architecture).

Students can submit project abstracts and details. RIC members review proposals from every department, assess potential topic overlap with existing projects, and approve, reject, or request changes. Similarity results use local text matching, are advisory, and do not replace RIC's final decision. Other faculty users can view approved projects only.

RIC Heads, RIC Administrators, and RIC Members can manage the department directory and permitted faculty list from **Institution & Departments**. New projects must select an existing department and faculty lead; team members must be permitted faculty in that department. Project totals are linked only when a record has an explicit managed-department assignment. Legacy records without that link remain unchanged and appear as unlinked rather than being inferred into a department.

The institution directory includes the supplied programme-to-department mapping. Department codes are optional until officially provided. B.Sc. Statistics and M.Sc. Actuarial Science are shown as unassigned programmes rather than being placed in a new department.

RIC accounts are assigned by an authorized RIC administrator; public self-registration is limited to student and faculty accounts.

To add an RIC account, sign in with an existing RIC Head/Administrator account, open **User Governance**, select **Add New Institutional User**, enter the member's name, institutional email, department, and an initial password, then choose:

- **RIC Member** for project review and evaluation access.
- **RIC Head / Administrator** only for an authorized person who also needs to manage institutional accounts.

Use a unique initial password of at least 6 characters and share it privately with the member. RIC accounts cannot be created through public self-registration.

---

### 🏛️ Official Institutional Identity & Emblem

- **Official College Emblem & Banner**: Features the authentic college logo with the Holy Cross circular seal, chapel tower, light of life flame, winged open book of wisdom, and motto:
  *"IGNITING THE LIGHT OF LIFE • EVIDENTLY EXCELLENT • ESTD 1995"*.
- **Classic Academic Styling**: Clean collegiate white canvas, royal blue branding, stately serif typography (**Cinzel** & **Merriweather**), and refined card design.
- **Real-Time Live Clock**: Indian Standard Time (IST) digital clock ticking live in the header.

---

### 👥 Institutional User Types

| User type | Designation & Description | Access & Governance Privileges |
| :--- | :--- | :--- |
| **Research and Innovation Cell (RIC) Members** (`ric_member`) | Committee reviewers and evaluators | • Review submissions across departments<br>• Check potential similarity with previous projects<br>• Evaluate proposals and take review actions<br>• Manage institution departments and permitted faculty |
| **RIC Head / Administrator** (`ric_head`) | Authorized account manager | • All RIC review and approval responsibilities<br>• Create and manage institutional accounts<br>• Manage institution departments and permitted faculty |
| **Other Teachers and Principal** (`faculty_principal`) | **Principal & Teaching Faculty**<br>*(e.g., Rev. Fr. Principal, Dr. Mary Scaria)* | • Read-only access to RIC-approved projects<br>• Cannot submit, edit, evaluate, or approve project records |
| **Students** (`student`) | **Student Researchers (UG / PG / PhD)**<br>*(e.g., Alphy Maria, Nidhin Paul)* | • Submit project abstracts, objectives, methods, and expected outcomes<br>• Track their own proposal status and RIC feedback<br>• View approved institutional projects |

---

### 🔑 1-Click Demo Accounts (Pre-Seeded)

On the login portal, click any of the **1-click quick-fill buttons** to test each role:

| Account type | Name | Email | Password |
| :--- | :--- | :--- | :--- |
| **RIC Member** | Dr. Mathew Joseph (Head, RIC) | `ric.head@bvmcherpunkal.edu.in` | `Admin@12345` |
| **Principal** | Rev. Fr. Principal | `principal@bvmcherpunkal.edu.in` | `Principal@123` |
| **Faculty** | Dr. Mary Scaria (Professor & HOD) | `faculty@bvmcherpunkal.edu.in` | `Faculty@123` |
| **Student** | Alphy Maria (PG Student Scholar) | `student@bvmcherpunkal.edu.in` | `Student@123` |
| **System Administrator** | IRIPGMS System Administrator | `admin@iripgms.college.edu` | `Admin@12345` |

*(Faculty and Students can also self-register directly via the **Register New User** tab on the login page!)*

---

### 🚀 How to Run in Terminal

In your terminal at `D:\Research cell`:

```powershell
node server.js
```

*(Or simply double-click [**`run.bat`**](file:///d:/Research%20cell/run.bat))*

The server starts immediately, runs on port `5000` (or `5001` if `5000` is occupied), and **automatically opens your default browser**.
