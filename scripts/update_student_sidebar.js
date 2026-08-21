const fs = require('fs');
let code = fs.readFileSync('components/student/student-sidebar.tsx', 'utf8');

if (!code.includes('/student/subscriptions')) {
  code = code.replace(
    /{ label: 'الفواتير', icon: Receipt, href: '\/student\/billing', badge: 'billing' },/g,
    `{ label: 'الفواتير', icon: Receipt, href: '/student/billing', badge: 'billing' },\n  { label: 'الاشتراكات', icon: CreditCard, href: '/student/subscriptions' },`
  );
}

if (!code.includes('CreditCard')) {
  code = code.replace(/import \{([\s\S]*?)\} from 'lucide-react'/, "import { $1, CreditCard } from 'lucide-react'");
}

fs.writeFileSync('components/student/student-sidebar.tsx', code);
