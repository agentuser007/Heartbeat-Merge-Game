# Mobile Aspect Ratio Solution Diagram

```mermaid
flowchart TD
    A[Screen Dimensions] --> B[Calculate Scale Factor]
    B --> C{Which is smaller?}
    C --> D[100vw / 430]
    C --> E[100vh / 932]
    C --> F[1]
    D --> G[min()]
    E --> G
    F --> G
    G --> H[Apply Scale Transform]
    H --> I[Center with translate(-50%, -50%)]
    I --> J[#game-container<br/>430px × 932px<br/>aspect-ratio: 430/932]

    style J fill:#FFE1CC,stroke:#DDAA8B,stroke-width:2px
    style A fill:#E9C3A8,stroke:#DDAA8B,stroke-width:1px
    style B fill:#E9C3A8,stroke:#DDAA8B,stroke-width:1px
    style C fill:#E9C3A8,stroke:#DDAA8B,stroke-width:1px
    style D fill:#E9C3A8,stroke:#DDAA8B,stroke-width:1px
    style E fill:#E9C3A8,stroke:#DDAA8B,stroke-width:1px
    style F fill:#E9C3A8,stroke:#DDAA8B,stroke-width:1px
    style G fill:#E9C3A8,stroke:#DDAA8B,stroke-width:1px
    style H fill:#E9C3A8,stroke:#DDAA8B,stroke-width:1px
    style I fill:#E9C3A8,stroke:#DDAA8B,stroke-width:1px

    linkStyle 0 stroke:#C99270,fill:none
    linkStyle 1 stroke:#C99270,fill:none
    linkStyle 2 stroke:#C99270,fill:none
    linkStyle 3 stroke:#C99270,fill:none
    linkStyle 4 stroke:#C99270,fill:none
    linkStyle 5 stroke:#C99270,fill:none
    linkStyle 6 stroke:#C99270,fill:none
    linkStyle 7 stroke:#C99270,fill:none
    linkStyle 8 stroke:#C99270,fill:none
```
