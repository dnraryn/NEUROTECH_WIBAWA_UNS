"use strict";
// Additive migration. No passwords or account codes are printed or written to disk.
process.env.DEBUG="";
const path=require("node:path"),crypto=require("node:crypto");
const cli=path.join(process.env.APPDATA,"npm/node_modules/firebase-tools/lib");
const {getGlobalDefaultAccount,getProjectDefaultAccount}=require(path.join(cli,"auth"));
const {requireAuth}=require(path.join(cli,"requireAuth"));
const {Client}=require(path.join(cli,"apiv2"));
const project="neurotech-id",base=`projects/${project}/databases/(default)/documents`;
const apply=process.argv.includes("--apply");
const route=name=>"/v1/"+name.split("/").map(encodeURIComponent).join("/");
const alphabet="ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const makeCode=role=>({pekerja:"P",supervisor:"S",management:"M"})[role]+"-"+Array.from(crypto.randomBytes(16),b=>alphabet[b%32]).join("");
(async()=>{
 const account=getProjectDefaultAccount(process.cwd())||getGlobalDefaultAccount();await requireAuth({...account,project,nonInteractive:true});
 const client=new Client({urlPrefix:"https://firestore.googleapis.com",auth:true});
 const list=async name=>{let result=[],token="";do{const response=(await client.get(route(name)+"?pageSize=100"+(token?"&pageToken="+encodeURIComponent(token):""))).body;result.push(...response.documents||[]);token=response.nextPageToken||"";}while(token);return result;};
 const get=async name=>{try{return(await client.get(route(name))).body;}catch(e){if(e.status===404)return null;throw e;}};
 const stats={mode:apply?"apply":"dry-run",companies:0,activeMembers:0,newCodes:0,newDirectoryEntries:0,committed:0};
 for(const company of await list(base+"/companies")){
   if(company.fields?.schemaVersion?.integerValue!=="2")continue;
   stats.companies++;
   const companyCode=company.fields.code?.stringValue;if(!companyCode)throw Error("invalid-company");
   for(const member of await list(company.name+"/members")){
     const f=member.fields;
     if(f?.status?.stringValue!=="active" || !f.uid?.stringValue)continue;
     const role=f.role?.stringValue,email=f.email?.stringValue;
     if(!["pekerja","supervisor","management"].includes(role)||!email)throw Error("invalid-member");
     stats.activeMembers++;
     const existing=f.loginCode?.stringValue,code=existing||makeCode(role);
     if(!/^[PSM]-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{16}$/.test(code))throw Error("invalid-existing-code");
     const directoryName=base+"/accountLogins/"+code,directory=await get(directoryName);
     if(directory && (directory.fields?.email?.stringValue!==email || directory.fields?.companyCode?.stringValue!==companyCode))throw Error("directory-conflict");
     const writes=[];
     if(!existing){stats.newCodes++;writes.push({update:{name:member.name,fields:{loginCode:{stringValue:code}}},updateMask:{fieldPaths:["loginCode"]},currentDocument:{updateTime:member.updateTime}});}
     if(!directory){stats.newDirectoryEntries++;writes.push({update:{name:directoryName,fields:{email:{stringValue:email},companyCode:{stringValue:companyCode}}},currentDocument:{exists:false}});}
     if(apply && writes.length){await client.post(`/v1/projects/${project}/databases/(default)/documents:commit`,{writes});stats.committed++;}
   }
 }
 console.log(JSON.stringify(stats));
})().catch(error=>{console.error("Login code migration failed:",error.status||error.code||"validation-failed");process.exitCode=1;});
