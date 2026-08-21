const fs = require('fs');
let code = fs.readFileSync('components/dashboard/sidebar.tsx', 'utf8');
if (!code.includes('CreditCard,')) {
  code = code.replace(/import \{([\s\S]*?)\} from 'lucide-react'/, "import { $1, CreditCard } from 'lucide-react'");
  fs.writeFileSync('components/dashboard/sidebar.tsx', code);
}
