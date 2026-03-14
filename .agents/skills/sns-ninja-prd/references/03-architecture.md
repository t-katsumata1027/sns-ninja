# 3. システムアーキテクチャ

## 3.1 全体アーキテクチャ図（Mermaid）

```mermaid
graph TB
    subgraph Client["クライアント層"]
        A[Next.js App Router]
        B[PWA Dashboard]
        C[Mobile App]
    end
    
    subgraph Edge["Vercel Edge"]
        D[Edge Functions]
        E[Middleware]
    end
    
    subgraph Backend["バックエンド層"]
        F[Next.js API Routes]
        G[tRPC Router]
        H[Inngest Workflows]
    end
    
    subgraph Queue["タスクキュー"]
        I[BullMQ]
        J[Redis Upstash]
    end
    
    subgraph Automation["自動化層"]
        K[Playwright Automation]
        L[Stealth Plugins]
        M[Browserless Cloud]
        N[Proxy Pool]
    end
    
    subgraph SNS["SNS API層"]
        O[X Twitter API]
        P[Instagram Graph API]
    end
    
    subgraph Data["データ層"]
        Q[Supabase PostgreSQL]
        R[RLS Policies]
        S[Gemini API]
        T[Flux API]
    end
    
    A --> D
    B --> D
    C --> D
    D --> E
    E --> F
    F --> G
    G --> H
    H --> I
    I --> J
    I --> K
    K --> L
    L --> M
    M --> N
    K --> O
    K --> P
    F --> Q
    H --> S
    H --> T
