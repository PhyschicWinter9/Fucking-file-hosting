import{r as w,j as e,H as _}from"./app-Ce2-6D92.js";import{B as i,D as v,C as y}from"./download-BYzG5TB5.js";import{c as m,B as u}from"./createLucideIcon-DNiMgBp1.js";import{C as a,a as n,b as d,c as r,d as c}from"./card-CISGUZzn.js";import{U as f,C as k}from"./upload-dk8bDYma.js";import{T as E}from"./trash-2-COYDk206.js";/* empty css            *//**
 * @license lucide-react v0.475.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const F=[["path",{d:"m12 19-7-7 7-7",key:"1l729n"}],["path",{d:"M19 12H5",key:"x3x0zl"}]],T=m("ArrowLeft",F);/**
 * @license lucide-react v0.475.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const C=[["polyline",{points:"16 18 22 12 16 6",key:"z7tu5w"}],["polyline",{points:"8 6 2 12 8 18",key:"1eg1df"}]],R=m("Code",C);/**
 * @license lucide-react v0.475.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const z=[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["path",{d:"M12 16v-4",key:"1dtifu"}],["path",{d:"M12 8h.01",key:"e9boi3"}]],D=m("Info",z);function $({maxFileSize:g,chunkThreshold:h}){const[b,j]=w.useState(null),t=l=>{if(l===0)return"0 Bytes";const o=1024,x=["Bytes","KB","MB","GB"],p=Math.floor(Math.log(l)/Math.log(o));return parseFloat((l/Math.pow(o,p)).toFixed(2))+" "+x[p]},N=(l,o)=>{navigator.clipboard.writeText(l),j(o),setTimeout(()=>j(null),2e3)},s=({code:l,language:o,id:x})=>e.jsxs("div",{className:"relative",children:[e.jsx("pre",{className:"overflow-x-auto rounded-lg bg-muted p-4 text-sm",children:e.jsx("code",{className:`language-${o}`,children:l})}),e.jsx(u,{variant:"ghost",size:"sm",className:"absolute top-2 right-2",onClick:()=>N(l,x),children:b===x?e.jsx(k,{className:"h-4 w-4 text-green-600"}):e.jsx(y,{className:"h-4 w-4"})})]});return e.jsxs(e.Fragment,{children:[e.jsx(_,{title:"API Documentation - Fucking File Hosting"}),e.jsxs("div",{className:"min-h-screen bg-background",children:[e.jsx("header",{className:"border-b border-border/40 bg-background/95 backdrop-blur",children:e.jsx("div",{className:"container mx-auto px-4 py-4",children:e.jsx("div",{className:"flex items-center justify-between",children:e.jsxs("div",{className:"flex items-center space-x-4",children:[e.jsx(u,{variant:"ghost",size:"sm",asChild:!0,children:e.jsxs("a",{href:"/",children:[e.jsx(T,{className:"mr-2 h-4 w-4"}),"Back to Upload"]})}),e.jsxs("div",{className:"flex items-center space-x-2",children:[e.jsx(R,{className:"h-6 w-6 text-primary"}),e.jsx("span",{className:"text-xl font-bold",children:"Fucking File API"})]})]})})})}),e.jsx("main",{className:"container mx-auto px-4 py-8",children:e.jsxs("div",{className:"mx-auto max-w-4xl space-y-8",children:[e.jsxs("div",{className:"text-center",children:[e.jsxs("h1",{className:"mb-4 text-4xl font-bold",children:[e.jsx("span",{className:"gradient-primary-text",children:"Fucking"})," File API Documentation"]}),e.jsx("p",{className:"mb-6 text-lg text-muted-foreground",children:"RESTful API for blazing fast file hosting. No authentication, no bullshit."}),e.jsxs("div",{className:"flex justify-center space-x-4",children:[e.jsx(i,{variant:"secondary",children:"REST API"}),e.jsx(i,{variant:"secondary",children:"No Auth Required"}),e.jsx(i,{variant:"secondary",children:"JSON Responses"})]})]}),e.jsxs(a,{children:[e.jsxs(n,{children:[e.jsx(d,{children:"Base URL"}),e.jsx(r,{children:"All API endpoints are relative to this base URL"})]}),e.jsx(c,{children:e.jsx(s,{code:`${window.location.origin}/api`,language:"text",id:"base-url"})})]}),e.jsxs(a,{children:[e.jsxs(n,{children:[e.jsxs(d,{className:"flex items-center space-x-2",children:[e.jsx(f,{className:"h-5 w-5"}),e.jsx("span",{children:"Upload File"})]}),e.jsxs(r,{children:["Upload a single file. Files larger than ",t(h)," should use chunked upload."]})]}),e.jsxs(c,{className:"space-y-4",children:[e.jsxs("div",{children:[e.jsx("h4",{className:"mb-2 font-semibold",children:"Endpoint"}),e.jsx(i,{variant:"outline",className:"mr-2",children:"POST"}),e.jsx("code",{children:"/upload"})]}),e.jsxs("div",{children:[e.jsx("h4",{className:"mb-2 font-semibold",children:"Parameters"}),e.jsxs("ul",{className:"space-y-1 text-sm",children:[e.jsxs("li",{children:[e.jsx("code",{children:"file"})," (required) - The file to upload"]}),e.jsxs("li",{children:[e.jsx("code",{children:"expiration_days"})," (optional) - Days until expiration (1-365)"]})]})]}),e.jsxs("div",{children:[e.jsx("h4",{className:"mb-2 font-semibold",children:"cURL Example"}),e.jsx(s,{code:`curl -X POST ${window.location.origin}/api/upload \\
  -F "file=@example.jpg" \\
  -F "expiration_days=30"`,language:"bash",id:"upload-curl"})]}),e.jsxs("div",{children:[e.jsx("h4",{className:"mb-2 font-semibold",children:"JavaScript Example"}),e.jsx(s,{code:`const formData = new FormData();
formData.append('file', fileInput.files[0]);
formData.append('expiration_days', '30');

const response = await fetch('${window.location.origin}/api/upload', {
  method: 'POST',
  body: formData
});

const result = await response.json();
console.log(result.data.download_url);`,language:"javascript",id:"upload-js"})]}),e.jsxs("div",{children:[e.jsx("h4",{className:"mb-2 font-semibold",children:"Response"}),e.jsx(s,{code:`{
  "success": true,
  "data": {
    "file_id": "abc123",
    "original_name": "example.jpg",
    "file_size": 1048576,
    "human_size": "1.00 MB",
    "mime_type": "image/jpeg",
    "download_url": "${window.location.origin}/f/abc123",
    "preview_url": "${window.location.origin}/p/abc123",
    "info_url": "${window.location.origin}/file/abc123",
    "expires_at": "2024-02-15T10:30:00.000Z",
    "created_at": "2024-01-15T10:30:00.000Z",
    "delete_token": "del_xyz789"
  }
}`,language:"json",id:"upload-response"})]})]})]}),e.jsxs(a,{children:[e.jsxs(n,{children:[e.jsxs(d,{className:"flex items-center space-x-2",children:[e.jsx(D,{className:"h-5 w-5"}),e.jsx("span",{children:"Get File Information"})]}),e.jsx(r,{children:"Retrieve metadata about an uploaded file"})]}),e.jsxs(c,{className:"space-y-4",children:[e.jsxs("div",{children:[e.jsx("h4",{className:"mb-2 font-semibold",children:"Endpoint"}),e.jsx(i,{variant:"outline",className:"mr-2",children:"GET"}),e.jsxs("code",{children:["/file/","{file_id}"]})]}),e.jsxs("div",{children:[e.jsx("h4",{className:"mb-2 font-semibold",children:"cURL Example"}),e.jsx(s,{code:`curl ${window.location.origin}/api/file/abc123`,language:"bash",id:"info-curl"})]}),e.jsxs("div",{children:[e.jsx("h4",{className:"mb-2 font-semibold",children:"Response"}),e.jsx(s,{code:`{
  "success": true,
  "data": {
    "file_id": "abc123",
    "original_name": "example.jpg",
    "file_size": 1048576,
    "human_size": "1.00 MB",
    "mime_type": "image/jpeg",
    "download_url": "${window.location.origin}/f/abc123",
    "preview_url": "${window.location.origin}/p/abc123",
    "info_url": "${window.location.origin}/file/abc123",
    "expires_at": "2024-02-15T10:30:00.000Z",
    "is_expired": false,
    "created_at": "2024-01-15T10:30:00.000Z"
  }
}`,language:"json",id:"info-response"})]})]})]}),e.jsxs(a,{children:[e.jsxs(n,{children:[e.jsxs(d,{className:"flex items-center space-x-2",children:[e.jsx(v,{className:"h-5 w-5"}),e.jsx("span",{children:"Download File"})]}),e.jsx(r,{children:"Direct file download with proper headers"})]}),e.jsxs(c,{className:"space-y-4",children:[e.jsxs("div",{children:[e.jsx("h4",{className:"mb-2 font-semibold",children:"Endpoint"}),e.jsx(i,{variant:"outline",className:"mr-2",children:"GET"}),e.jsxs("code",{children:["/f/","{file_id}"]})]}),e.jsxs("div",{children:[e.jsx("h4",{className:"mb-2 font-semibold",children:"Features"}),e.jsxs("ul",{className:"space-y-1 text-sm",children:[e.jsx("li",{children:"• Range requests supported (resume downloads)"}),e.jsx("li",{children:"• Proper Content-Disposition headers"}),e.jsx("li",{children:"• Download manager compatible"}),e.jsx("li",{children:"• Original filename preserved"})]})]}),e.jsxs("div",{children:[e.jsx("h4",{className:"mb-2 font-semibold",children:"cURL Example"}),e.jsx(s,{code:`curl -O -J ${window.location.origin}/f/abc123`,language:"bash",id:"download-curl"})]})]})]}),e.jsxs(a,{children:[e.jsxs(n,{children:[e.jsxs(d,{className:"flex items-center space-x-2",children:[e.jsx(E,{className:"h-5 w-5"}),e.jsx("span",{children:"Delete File"})]}),e.jsx(r,{children:"Delete a file using the owner's delete token"})]}),e.jsxs(c,{className:"space-y-4",children:[e.jsxs("div",{children:[e.jsx("h4",{className:"mb-2 font-semibold",children:"Endpoint"}),e.jsx(i,{variant:"outline",className:"mr-2",children:"DELETE"}),e.jsxs("code",{children:["/file/","{file_id}"]})]}),e.jsxs("div",{children:[e.jsx("h4",{className:"mb-2 font-semibold",children:"Headers"}),e.jsxs("code",{children:["Authorization: Bearer ","{delete_token}"]})]}),e.jsxs("div",{children:[e.jsx("h4",{className:"mb-2 font-semibold",children:"cURL Example"}),e.jsx(s,{code:`curl -X DELETE ${window.location.origin}/api/file/abc123 \\
  -H "Authorization: Bearer del_xyz789"`,language:"bash",id:"delete-curl"})]}),e.jsxs("div",{children:[e.jsx("h4",{className:"mb-2 font-semibold",children:"Response"}),e.jsx(s,{code:`{
  "success": true,
  "message": "File deleted successfully"
}`,language:"json",id:"delete-response"})]})]})]}),e.jsxs(a,{children:[e.jsxs(n,{children:[e.jsxs(d,{className:"flex items-center space-x-2",children:[e.jsx(f,{className:"h-5 w-5"}),e.jsx("span",{children:"Chunked Upload"})]}),e.jsxs(r,{children:["For files larger than ",t(h)," or unreliable connections"]})]}),e.jsxs(c,{className:"space-y-4",children:[e.jsxs("div",{children:[e.jsx("h4",{className:"mb-2 font-semibold",children:"1. Initialize Session"}),e.jsx(i,{variant:"outline",className:"mr-2",children:"POST"}),e.jsx("code",{children:"/chunked-upload"}),e.jsx(s,{code:`curl -X POST ${window.location.origin}/api/chunked-upload \\
  -H "Content-Type: application/json" \\
  -d '{
    "action": "initialize",
    "original_name": "large-file.zip",
    "total_size": 104857600,
    "chunk_size": 5242880
  }'`,language:"bash",id:"chunked-init"})]}),e.jsxs("div",{children:[e.jsx("h4",{className:"mb-2 font-semibold",children:"2. Upload Chunks"}),e.jsx(i,{variant:"outline",className:"mr-2",children:"POST"}),e.jsx("code",{children:"/chunked-upload"}),e.jsx(s,{code:`curl -X POST ${window.location.origin}/api/chunked-upload \\
  -F "action=upload_chunk" \\
  -F "session_id=session_abc123" \\
  -F "chunk_index=0" \\
  -F "chunk=@chunk_0.bin"`,language:"bash",id:"chunked-upload"})]}),e.jsxs("div",{children:[e.jsx("h4",{className:"mb-2 font-semibold",children:"3. Finalize Upload"}),e.jsx(i,{variant:"outline",className:"mr-2",children:"POST"}),e.jsx("code",{children:"/finalize-upload"}),e.jsx(s,{code:`curl -X POST ${window.location.origin}/api/finalize-upload \\
  -H "Content-Type: application/json" \\
  -d '{
    "session_id": "session_abc123",
    "expiration_days": 30
  }'`,language:"bash",id:"chunked-finalize"})]})]})]}),e.jsxs(a,{children:[e.jsxs(n,{children:[e.jsx(d,{children:"Error Responses"}),e.jsx(r,{children:"Standard error format for all endpoints"})]}),e.jsxs(c,{className:"space-y-4",children:[e.jsxs("div",{children:[e.jsx("h4",{className:"mb-2 font-semibold",children:"Error Format"}),e.jsx(s,{code:`{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable error message",
    "details": {
      "additional": "error details"
    }
  }
}`,language:"json",id:"error-format"})]}),e.jsxs("div",{children:[e.jsx("h4",{className:"mb-2 font-semibold",children:"Common Error Codes"}),e.jsxs("ul",{className:"space-y-1 text-sm",children:[e.jsxs("li",{children:[e.jsx("code",{children:"VALIDATION_ERROR"})," - Invalid request parameters"]}),e.jsxs("li",{children:[e.jsx("code",{children:"FILE_TOO_LARGE"})," - File exceeds size limit"]}),e.jsxs("li",{children:[e.jsx("code",{children:"FILE_NOT_FOUND"})," - File doesn't exist or expired"]}),e.jsxs("li",{children:[e.jsx("code",{children:"UPLOAD_ERROR"})," - General upload failure"]}),e.jsxs("li",{children:[e.jsx("code",{children:"UNAUTHORIZED"})," - Invalid delete token"]})]})]})]})]}),e.jsxs(a,{children:[e.jsxs(n,{children:[e.jsx(d,{children:"Rate Limits & Restrictions"}),e.jsx(r,{children:"Current system limitations"})]}),e.jsx(c,{children:e.jsxs("ul",{className:"space-y-2 text-sm",children:[e.jsxs("li",{children:["• ",e.jsx("strong",{children:"Max file size:"})," ",t(g)]}),e.jsxs("li",{children:["• ",e.jsx("strong",{children:"Chunked upload threshold:"})," ",t(h)]}),e.jsxs("li",{children:["• ",e.jsx("strong",{children:"Rate limiting:"})," None (unlimited uploads)"]}),e.jsxs("li",{children:["• ",e.jsx("strong",{children:"Authentication:"})," Not required"]}),e.jsxs("li",{children:["• ",e.jsx("strong",{children:"File retention:"})," 1-365 days (configurable)"]}),e.jsxs("li",{children:["• ",e.jsx("strong",{children:"Supported methods:"})," GET, POST, DELETE"]})]})})]})]})})]})]})}export{$ as default};
