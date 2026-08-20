"use client"

import { useState } from "react"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { updateReleases } from "./actions"

type ContentItem = {
  id: string
  title: string
  is_published: boolean
  release_date: Date | null
}

export default function ReleaseManagerClient({
  data
}: {
  data: {
    lectures: ContentItem[]
    lessons: ContentItem[]
    exams: ContentItem[]
    monthlyCourses: ContentItem[]
  }
}) {
  const [activeTab, setActiveTab] = useState("lectures")
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  
  const [bulkIsPublished, setBulkIsPublished] = useState(true)
  const [bulkReleaseDate, setBulkReleaseDate] = useState("")

  const currentData = data[activeTab as keyof typeof data] || []

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  const selectAll = () => {
    if (selectedIds.length === currentData.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(currentData.map(item => item.id))
    }
  }

  const handleBulkUpdate = async () => {
    if (selectedIds.length === 0) return
    const dateObj = bulkReleaseDate ? new Date(bulkReleaseDate) : null
    await updateReleases(activeTab, selectedIds, bulkIsPublished, dateObj)
    setSelectedIds([])
    alert("تم التحديث بنجاح!")
  }

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={(val) => { setActiveTab(val); setSelectedIds([]); }}>
        <TabsList>
          <TabsTrigger value="lectures">المحاضرات</TabsTrigger>
          <TabsTrigger value="lessons">الدروس</TabsTrigger>
          <TabsTrigger value="exams">الامتحانات</TabsTrigger>
          <TabsTrigger value="monthlyCourses">الكورسات الشهرية</TabsTrigger>
        </TabsList>

        <div className="mt-6 flex flex-wrap items-center gap-4 bg-muted p-4 rounded-lg">
          <div className="flex items-center gap-2">
            <input 
              type="checkbox" 
              id="bulk-publish" 
              checked={bulkIsPublished} 
              onChange={e => setBulkIsPublished(e.target.checked)} 
              className="w-4 h-4"
            />
            <label htmlFor="bulk-publish">منشور (Published)</label>
          </div>
          
          <div className="flex items-center gap-2">
            <label>تاريخ النشر (Release Date):</label>
            <Input 
              type="datetime-local" 
              value={bulkReleaseDate}
              onChange={e => setBulkReleaseDate(e.target.value)}
              className="w-auto"
            />
          </div>

          <Button onClick={handleBulkUpdate} disabled={selectedIds.length === 0}>
            تطبيق على المحدد ({selectedIds.length})
          </Button>
        </div>

        <TabsContent value={activeTab} className="mt-4">
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12 text-center">
                    <input 
                      type="checkbox" 
                      checked={selectedIds.length > 0 && selectedIds.length === currentData.length}
                      onChange={selectAll}
                      className="w-4 h-4"
                    />
                  </TableHead>
                  <TableHead className="text-right">العنوان</TableHead>
                  <TableHead className="text-right">الحالة</TableHead>
                  <TableHead className="text-right">تاريخ النشر</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-4">
                      لا توجد بيانات
                    </TableCell>
                  </TableRow>
                ) : (
                  currentData.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="text-center">
                        <input 
                          type="checkbox" 
                          checked={selectedIds.includes(item.id)}
                          onChange={() => toggleSelection(item.id)}
                          className="w-4 h-4"
                        />
                      </TableCell>
                      <TableCell>{item.title}</TableCell>
                      <TableCell>
                        <span className={item.is_published ? "text-green-600" : "text-red-600"}>
                          {item.is_published ? "منشور" : "مخفي"}
                        </span>
                      </TableCell>
                      <TableCell>
                        {item.release_date 
                          ? new Date(item.release_date).toLocaleString('ar-EG') 
                          : "لا يوجد"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
