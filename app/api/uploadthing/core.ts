import { createUploadthing, type FileRouter } from 'uploadthing/next'

const f = createUploadthing()

export const ourFileRouter = {
  receiptUploader: f({ image: { maxFileSize: "4MB", maxFileCount: 1 } })
    .onUploadComplete(async ({ metadata, file }) => {
      return { url: file.url };
    }),
  // Curriculum artwork (stages / branches / lectures) uploaded from admin.
  curriculumImage: f({ image: { maxFileSize: "8MB", maxFileCount: 1 } })
    .onUploadComplete(async ({ file }) => {
      return { url: file.url };
    }),
} satisfies FileRouter

export type OurFileRouter = typeof ourFileRouter
