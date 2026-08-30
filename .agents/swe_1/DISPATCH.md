## 2026-08-30T02:27:26+03:00
<USER_REQUEST>
You are teamwork_preview_swe.
Your working directory is: d:\Workspace\LMS
Your agent directory is: d:\Workspace\LMS\.agents\swe_1
The authoritative user request is in: d:\Workspace\LMS\.agents\ORIGINAL_REQUEST.md

Task details:
استعادة الواجهة والصفحات العامة والفرعية وتنسيقات CSS بالكامل من المستودع المرجعي القديم مع دمجها وتوافقها التام مع الباك إند الحالي وحوكمة نظام الاشتراكات.

Reference repository: C:\Users\ASUS\.gemini\antigravity\brain\5d20df95-ba9c-417a-a01e-0868e85f8cc7\scratch\old_repo
Current working codebase: d:\Workspace\LMS

Requirements:
1. R1: استعادة الواجهات والصفحات العامة بالكامل من المستودع القديم (Landing components: Header, Hero, Features, Stages, Testimonials, CTA, Footer; Stages pages app/stages/*; Auth pages app/auth/*).
2. R2: استعادة ملفات التنسيق والـ CSS القديمة (globals.css والمتغيرات).
3. R3: التكامل مع الباك إند الحالي وحوكمة الاشتراكات (getCurriculum, getSiteContent, getPublicSubscriptionContext, getPublicSubscriptionPlans, cart-actions, auth, subscription_mode).

Acceptance Criteria:
- Landing page (/) shows all old sections with full styling.
- Stages pages (/stages/[id]) show old design and fetch data correctly.
- Auth pages (/auth) match old design and work with current NextAuth sessions.
- globals.css matches old repo.
- Subscription modes (purchases_only, subscriptions_only, hybrid) are respected.
- Cart and checkout work smoothly.
- Build passes: cmd /c npm run build.

Important User Rules:
- Execute terminal commands immediately with cmd /c prefix.
- All communications/reports in Arabic.

Please execute the SWE Light loop, perform implementation and review/testing verification, and report back when finished.
</USER_REQUEST>
