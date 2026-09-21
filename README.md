# Tolga Bilgis / Portfolio

My personal portfolio website, built with HTML, CSS, and JavaScript.

**Live:** [tolgabilgis.com](https://tolgabilgis.com)

Hosted on my three-node Kubernetes homelab, served by an unprivileged Nginx container and published through Cloudflare Tunnel with HTTPS.

GitHub Actions builds and tests the container, publishes it to GitHub Container Registry, and opens a deployment PR in my [homelab repository](https://github.com/TolgaBilgis/homelab). After checks pass and the PR automatically merges, Argo CD deploys the image pinned by digest.

## Delivery pipeline

```mermaid
flowchart TD
    subgraph APP["Repository: portfolio-site"]
        A["Push website changes to main"]
        B["GitHub Actions: build Nginx image"]
        C["Test homepage, resume PDF, and non-root user"]
        D["Publish image and resolve digest"]
        A --> B --> C --> D
    end

    GHCR[("GitHub Container Registry")]
    D --> GHCR

    subgraph INFRA["Repository: homelab"]
        F["Open PR updating portfolio image digest"]
        G["Required CI checks: Ansible validation"]
        H["Auto-merge into main"]
        F --> G --> H
    end
    D --> F

    subgraph K8S["Homelab Kubernetes cluster"]
        I["Argo CD watches main: kubernetes/apps"]
        J["Apply Deployment and pull image by digest"]
        K["Rolling update with readiness checks"]
        P["Ready portfolio Pods: port 8080"]
        T["cloudflared Pods"]
        S["portfolio-site Service: port 80"]
        I --> J --> K --> P
        T --> S --> P
    end
    H --> I
    GHCR --> J

    V["Visitor: https://tolgabilgis.com"]
    CF["Cloudflare HTTPS"]
    V --> CF
    CF -->|"Encrypted tunnel"| T
```

Argo CD watches the homelab repository, not the website source or the image registry. A merged image-digest change triggers deployment; visitor traffic reaches ready Pods through the tunnel and Kubernetes Service.
