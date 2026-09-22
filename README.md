# Tolga Bilgis / Portfolio

My personal portfolio website, built with HTML, CSS, and JavaScript.

**Live:** [tolgabilgis.com](https://tolgabilgis.com)

Hosted on my three-node Kubernetes homelab, served by an unprivileged Nginx container and published through Cloudflare Tunnel with HTTPS.

GitHub Actions builds and tests the container, publishes it to GitHub Container Registry, and opens a deployment PR in my [homelab repository](https://github.com/TolgaBilgis/homelab). After checks pass and the PR automatically merges, Argo CD deploys the image pinned by digest.

## Delivery pipeline

```mermaid
flowchart TB
    subgraph APP["portfolio-site repo"]
        A["Push to main"] --> B["GitHub Actions: build and test"]
    end
    B --> C["GHCR: publish container image"]
    subgraph INFRA["homelab repo"]
        D["PR: update image digest"] --> E["CI checks pass and PR merges"]
    end
    C --> D
    E --> F["Argo CD syncs manifests"]
    F --> G["Kubernetes rolls out ready Pods"]
    C -.->|"pull image"| G
```

### Website traffic

```mermaid
flowchart LR
    A["Visitor"] -->|"HTTPS"| B["Cloudflare"]
    B -->|"Tunnel"| C["cloudflared"]
    C --> D["Service :80"]
    D --> E["Portfolio Pods :8080"]
```

