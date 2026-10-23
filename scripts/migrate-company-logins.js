"use strict";
// Additive company login mappings only. Never print identities, login links or credentials.
process.env.DEBUG="";
const path=require("node:path");
const cli=path.join(process.env.APPDATA,"npm/node_modules/firebase-tools/lib");
const {getGlobalDefaultAccount,getProjectDefaultAccount}=require(path.join(cli,"auth"));
const {requireAuth}=require(path.join(cli,"requireAuth"));
const {Client}=require(path.join(cli,"apiv2"));
const project="neurotech-id",base=`projects/${project}/databases/(default)/documents`;
const apply=process.argv.includes("--apply");
const route=name=>"/v1/"+name.split("/").map(encodeURIComponent).join("/");
const prefixes={pekerja:"P",supervisor:"S",management:"M"};
const valid=value=>/^[PSM](00[1-9]|0[1-9][0-9]|[1-9][0-9]{2,5})$/.test(value);
(async()=>{
 const account=getProjectDefaultAccount(process.cwd())||getGlobalDefaultAccount();await requireAuth({...account,project,nonInteractive:true});
 const client=new Client({urlPrefix:"https://firestore.googleapis.com",auth:true});
 const list=async name=>{let result=[],token="";do{const response=(await client.get(route(name)+"?pageSize=100"+(token?"&pageToken="+encodeURIComponent(token):""))).body;result.push(...response.documents||[]);token=response.nextPageToken||"";}while(token);return result;};
 const get=async name=>{try{return(await client.get(route(name))).body;}catch(e){if(e.status===404)return null;throw e;}};

 const stats={mode:apply?"apply":"dry-run",companies:0,accounts:0,newMappings:0,committed:0};
 for(const company of await list(base+"/companies")){
  if(company.fields?.schemaVersion?.integerValue!=="2")continue;
  stats.companies++;const code=company.fields.code.stringValue,writes=[];
  for(const member of await list(company.name+"/members")){
   const f=member.fields,label=f.accountCode?.stringValue,login=f.loginCode?.stringValue;
   if(!["active","invited"].includes(f.status?.stringValue)||!label||!login)continue;
   if(!valid(label)||!/^[PSM]-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{16}$/.test(login))throw Error("invalid-identity");
   stats.accounts++;const name=base+"/companyLogins/"+code+"/accounts/"+label,existing=await get(name);
   if(existing){if(existing.fields?.loginCode?.stringValue!==login)throw Error("mapping-conflict");continue;}
   stats.newMappings++;writes.push({update:{name,fields:{loginCode:{stringValue:login}}},currentDocument:{exists:false}});
  }
  if(apply && writes.length){await client.post(`/v1/projects/${project}/databases/(default)/documents:commit`,{writes});stats.committed+=writes.length;}
 }
 console.log(JSON.stringify(stats));
})().catch(error=>{console.error("Company login migration failed:",error.status||error.code||"validation-failed");process.exitCode=1;});
