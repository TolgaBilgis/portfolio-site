# Tolga Bilgis / Portfolio

My personal portfolio website, built with HTML, CSS, and JavaScript.

**Live:** [tolgabilgis.com](https://tolgabilgis.com)

## Cloud Hop

Play at [tolgabilgis.com/game](https://tolgabilgis.com/game/). A standalone canvas
platformer with three levels, double jumps, optional stars, checkpoints, touch
controls, optional sound, and local personal bests. Move with arrows or A/D;
jump with Space, W, or Up (press again for a double jump). P pauses and R
restarts the current level. Island tops are one-way platforms.

The portfolio only gains a navigation link. Game code, styles, and the supplied
character photo live in `game/` and load only on the game page. No dependencies
or external services are required. Serve this directory with any static server
for local play, for example `python3 -m http.server 8000`.

To remove the game, revert the commit titled `Add Cloud Hop platformer at /game`
and push the revert to main. This restores the previous portfolio, container
configuration, and checks through the same deployment pipeline without rewriting
Git history. The original baseline is `93159e67f882049829e93c0cf5969db27411cbee`.

Hosted on my three-node Kubernetes homelab, served by an unprivileged Nginx container and published through Cloudflare Tunnel with HTTPS.

GitHub Actions builds and tests the container, publishes it to GitHub Container Registry, and opens a deployment PR in my [homelab repository](https://github.com/TolgaBilgis/homelab). After checks pass and the PR automatically merges, Argo CD deploys the image pinned by digest.

## Delivery pipeline

From a source-code push to a running release. Each color marks a different part of the system.

```mermaid
flowchart TB
    subgraph SOURCE["01 · BUILD & TEST — portfolio-site"]
        A(["Push to main"]) --> B["GitHub Actions<br/>Build Nginx container"]
        B --> C["Smoke tests<br/>Homepage · Resume PDF · Non-root"]
    end

    C -->|"tests pass"| D[("GHCR<br/>Immutable image digest")]

    subgraph CONFIG["02 · REVIEW & PROMOTE — homelab"]
        E["Deployment PR<br/>Update image digest"] --> F["Required CI checks<br/>Ansible validation"]
        F --> G(["Auto-merge to main"])
    end
    D -->|"automated PR"| E

    subgraph CLUSTER["03 · RECONCILE & DEPLOY — Kubernetes"]
        H["Argo CD<br/>Watch main / kubernetes/apps"]
        H --> I["Rolling update<br/>Readiness checks"]
        I --> J(["Portfolio running<br/>2 replicas configured"])
    end
    G -->|"desired state"| H
    D -.->|"nodes pull image by digest"| I

    classDef source fill:#dbeafe,stroke:#2563eb,color:#172554,stroke-width:2px;
    classDef registry fill:#fef3c7,stroke:#d97706,color:#451a03,stroke-width:2px;
    classDef config fill:#ede9fe,stroke:#7c3aed,color:#2e1065,stroke-width:2px;
    classDef runtime fill:#dcfce7,stroke:#16a34a,color:#14532d,stroke-width:2px;
    class A,B,C source;
    class D registry;
    class E,F,G config;
    class H,I,J runtime;
    style SOURCE fill:#eff6ff,stroke:#93c5fd,color:#172554
    style CONFIG fill:#f5f3ff,stroke:#c4b5fd,color:#2e1065
    style CLUSTER fill:#f0fdf4,stroke:#86efac,color:#14532d
```

Argo CD reads the homelab repository independently of the local checkout. It deploys the image digest recorded in Git once the deployment PR merges.

### How visitors reach the site

```mermaid
flowchart LR
    V(["Visitor"]) -->|"HTTPS"| C["Cloudflare<br/>tolgabilgis.com"]
    C -->|"Encrypted tunnel"| T["cloudflared<br/>2 replicas configured"]
    T --> S["Kubernetes Service<br/>portfolio-site:80"]
    S --> P(["Ready portfolio Pods<br/>Nginx :8080"])

    classDef edge fill:#ffedd5,stroke:#ea580c,color:#431407,stroke-width:2px;
    classDef cluster fill:#dcfce7,stroke:#16a34a,color:#14532d,stroke-width:2px;
    classDef visitor fill:#dbeafe,stroke:#2563eb,color:#172554,stroke-width:2px;
    class V visitor;
    class C edge;
    class T,S,P cluster;
```
