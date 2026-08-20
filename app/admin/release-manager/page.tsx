import { getReleaseData } from "./actions"
import ReleaseManagerClient from "./client"

export default async function ReleaseManagerPage() {
  const data = await getReleaseData()

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">إدارة النشر (Release Manager)</h1>
      <ReleaseManagerClient data={data} />
    </div>
  )
}
