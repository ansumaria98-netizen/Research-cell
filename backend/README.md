# BVM Holy Cross College, Cherpunkal — IRIPGMS
## Institutional Research, Innovation and Project Governance Management System
### Module 1: User Login & Access Control • Module 2: Dashboard Overview

An institutional-grade, full-page research management web platform designed for **Bishop Vayalil Memorial Holy Cross College, Cherpunkal, Kottayam, Kerala** (Affiliated to Mahatma Gandhi University, NAAC Re-Accredited, ESTD 1995).

Built with **Node.js, Express.js, React.js, and MongoDB** (Zero Vite, No Bundlers, Single-Server Architecture).

---

### 🏛️ Official Institutional Identity & Emblem

- **Official College Emblem & Banner**: Features the authentic college logo with the Holy Cross circular seal, chapel tower, light of life flame, winged open book of wisdom, and motto:
  *"IGNITING THE LIGHT OF LIFE • EVIDENTLY EXCELLENT • ESTD 1995"*.
- **Classic Academic Styling**: Clean collegiate white canvas, royal blue branding, stately serif typography (**Cinzel** & **Merriweather**), and refined card design.
- **Real-Time Live Clock**: Indian Standard Time (IST) digital clock ticking live in the header.

---

### 👥 The 3 Official Institutional Roles

The system is organized into the **3 core roles** requested:

| # | Official Role | Designation & Description | Access & Governance Privileges |
| :---: | :--- | :--- | :--- |
| **1** | **Research and Innovation Members as Head** (`ric_head`) | **Head of RIC & Committee Evaluators**<br>*(e.g., Dr. Mathew Joseph)* | • Full research governance & policy control<br>• Proposal scrutiny, scoring & sanction orders<br>• Set committee review deadlines & monitor timelines<br>• User Governance (Module 1): Activate/Deactivate accounts |
| **2** | **Other Teachers and Principal** (`faculty_principal`) | **Principal & Teaching Faculty**<br>*(e.g., Rev. Fr. Principal, Dr. Mary Scaria)* | • Submit major & minor faculty research proposals<br>• Executive oversight & recommendations<br>• Track real-time proposal committee evaluation<br>• Co-author and mentor student innovation projects |
| **3** | **Students** (`student`) | **Student Researchers (UG / PG / PhD)**<br>*(e.g., Alphy Maria, Nidhin Paul)* | • Submit student innovation proposals & capstones<br>• Nominate faculty guides and mentors<br>• Track real-time review status & committee feedback<br>• View published campus innovation repository |

---

### 🔑 1-Click Demo Accounts (Pre-Seeded)

On the login portal, click any of the **1-click quick-fill buttons** to test each role:

| Role Tier | Name | Email | Password |
| :--- | :--- | :--- | :--- |
| **Role 1: RIC Head / Member** | Dr. Mathew Joseph (Head, RIC) | `ric.head@bvmcherpunkal.edu.in` | `Admin@12345` |
| **Role 2: Principal** | Rev. Fr. Principal | `principal@bvmcherpunkal.edu.in` | `Principal@123` |
| **Role 2: Teaching Faculty** | Dr. Mary Scaria (Professor & HOD) | `faculty@bvmcherpunkal.edu.in` | `Faculty@123` |
| **Role 3: Student Researcher** | Alphy Maria (PG Student Scholar) | `student@bvmcherpunkal.edu.in` | `Student@123` |
| **System Super Admin** | IRIPGMS System Administrator | `admin@iripgms.college.edu` | `Admin@12345` |

*(Faculty and Students can also self-register directly via the **Register New User** tab on the login page!)*

---

### 🚀 How to Run in Terminal

In your terminal at `D:\Research cell`:

```powershell
node server.js
```

*(Or simply double-click [**`run.bat`**](file:///d:/Research%20cell/run.bat))*

The server starts immediately, runs on port `5000` (or `5001` if `5000` is occupied), and **automatically opens your default browser**.
