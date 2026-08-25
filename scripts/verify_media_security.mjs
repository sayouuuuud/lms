import fetch from 'node-fetch';  
async function testMediaRoute() {  
  const res = await fetch('http://localhost:3000/api/media/videos/test-video.mp4');  
  if (res.status === 401 || res.status === 403) console.log('OK Media');  
  else { console.error('FAIL Media ' + res.status); process.exitCode = 1; }  
}  
async function testAttachmentRoute() {  
  const res = await fetch('http://localhost:3000/api/attachments/test-attachment.pdf');  
  if (res.status === 401 || res.status === 403) console.log('OK Attachment');  
  else { console.error('FAIL Attachment ' + res.status); process.exitCode = 1; }  
}  
testMediaRoute().then(testAttachmentRoute); 
