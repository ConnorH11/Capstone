# SubnetSuite

**SubnetSuite** is a feature-rich, .NET-based web application that provides tools for subnetting, VLSM design, supernetting, binary math, IPv6 calculations, and visual network planning.

Live Site: [https://subnetsuite.com](https://subnetsuite.com)

---

## 🛠️ Features

### 🌐 Subnet Calculator
- Supports both CIDR and dotted-decimal input
- Displays subnet mask, wildcard mask, broadcast, host range, and binary breakdown

### 📐 VLSM Calculator
- Accepts multiple subnets with host requirements
- Calculates network ranges using Variable Length Subnet Masking
- Exports results to CSV
- Optional subnet labeling

### 🎯 Supernet Calculator
- Aggregates multiple CIDRs into a single supernet
- Supports two modes:
  - Smallest supernet CIDR
  - Minimal CIDR aggregation

### 🖥 VLSM Visualizer
- Drag-and-drop interface for routers, switches, PCs, servers, etc.
- Connect devices with cables
- Auto-generate subnets based on connections
- IPs auto-assigned to interfaces and end devices
- CSV export and colored subnet grouping

### 📊 Binary Calculator
- Add or subtract binary numbers
- View result in both binary and decimal

### 🔁 Binary/Decimal/Hex Converter
- Instantly converts between binary, decimal, and hexadecimal formats

### 🧮 IPv6 Calculator
- Expands and compresses IPv6 addresses
- Calculates usable range and subnet allocations

### 📈 Uptime Monitoring (Internal Dashboard)
- Powered by Uptime Kuma (self-hosted)
- Monitors availability and response time of services

---

## 🚀 Deployment & CI/CD

This app is deployed on a **Windows Server 2022** using:

- `.NET 8.0`
- **GitHub Actions CI/CD** with a self-hosted runner
- Cloudflare Tunnel to expose `localhost:5000` to `https://subnetsuite.com`
- Auto-restart via Windows service

### Example CI/CD Flow:

1. `git push origin main`
2. GitHub Actions pulls the latest code on the server
3. The project is published to `C:\Published\SubnetSuite`
4. The app is restarted and served via `dotnet SubnetCalc.dll --urls=http://localhost:5000`

---

## ⚙️ Tech Stack

- .NET 8 (ASP.NET Razor Pages)
- Bootstrap 5
- JavaScript (including SVG and drag/drop)
- Cloudflare Tunnel
- GitHub Actions
- Windows Server 2022

---

## 👨‍💻 Author

**Connor Horning**  
📫 [connor@connorhorning.com](mailto:connor@connorhorning.com)  
🌐 [https://connorhorning.com](https://connorhorning.com)

---


