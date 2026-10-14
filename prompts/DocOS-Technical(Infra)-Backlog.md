# DocOS — Technical (Infra) Backlog

Technical infrastructure, packaging, and hosting items separated from clinic/product feature roadmaps. Items here are deferred until dedicated infrastructure and multi-tenant scaling phases.

---

## Technical & Infrastructure Items

| ID | Topic | Why deferred | Target Stage | Status |
| :--- | :--- | :--- | :--- | :--- |
| **B03** | **Subdomain tenant routing & wildcard DNS** | `ClinicId` embedded on the JWT token remains the canonical multi-tenant key through Phase 2. Hostname-based tenant resolution (e.g., `clinicname.docos.in`) adds routing, SSL provisioning, and CORS complexity that is not required for single-domain OPD operation. | Scale / Enterprise | `idea` |
| **B04** | **Kubernetes, Helm & white-label packaging** | Single-container and managed cloud/VM deployments (such as Render, App Service, or Docker Compose) are sufficient for Phase 2. Kubernetes orchestration, Helm charts, and on-premises white-label appliance packaging belong to an enterprise deployment track. | Scale / On-Prem | `idea` |

---

## Detailed Notes

### B03 — Subdomain Tenant Routing & Wildcard DNS
- **Description:** Allow clinics to access the SaaS via dedicated vanity subdomains (e.g., `https://apex.docos.in` or custom CNAME domains).
- **Current Architecture:** Tenant isolation is enforced at the application boundary via `ICurrentUserService.ClinicId` extracted from signed JWT claims. The web client operates on a single origin, passing standard Bearer tokens.
- **When to Promote:** When clinic branding, tenant vanity URLs, or isolated SSO configurations become commercial requirements.
- **Architectural Requirements:**
  - Wildcard TLS certificate management (e.g., Let's Encrypt / Cloudflare for SaaS).
  - Reverse proxy / middleware resolving subdomains to `Clinic.Slug` or `Clinic.Id`.
  - CORS policy allowing wildcard/dynamic origins (`*.docos.in` and custom domains).
  - Cookie/storage isolation rules across subdomains if session sharing is restricted.

### B04 — Kubernetes, Helm & White-Label Packaging
- **Description:** Provide production-ready Kubernetes manifests, Helm charts, and automated container bundling for high-availability self-hosted, sovereign, or enterprise hospital deployments.
- **Current Architecture:** Backend runs as a unified ASP.NET Core container (`DocOS.API`), database is hosted on Microsoft SQL Server, and frontend assets are distributed as static files.
- **When to Promote:** When enterprise hospital networks or government tenders require on-premises deployment, private air-gapped instances, or elastic auto-scaling clusters.
- **Architectural Requirements:**
  - Helm chart parameterizing connection strings, JWT secrets, replica counts, and ingress controllers.
  - Health probe definitions (`/healthz` liveness and readiness endpoints).
  - Database migration Job or init container execution strategy.
  - Secret management via Kubernetes Secrets, HashiCorp Vault, or cloud secret providers.
