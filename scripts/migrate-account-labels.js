"use strict";
// Additive labels only. Never print identities, login links or credentials.
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
 const stats={mode:apply?"apply":"dry-run",companies:0,eligibleMembers:0,newLabels:0,sequenceWrites:0,committedCompanies:0};
 for(const company of await list(base+"/companies")){
   if(company.fields?.schemaVersion?.integerValue!=="2")continue;
   stats.companies++;
   const members=(await list(company.name+"/members")).filter(m=>["active","invited"].includes(m.fields?.status?.stringValue)
     && /^[PSM]-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{16}$/.test(m.fields?.loginCode?.stringValue || "")).sort((a,b)=>a.name.localeCompare(b.name));
   stats.eligibleMembers+=members.length;
   const assigned=new Set(), maxima={P:0,S:0,M:0};
   for(const member of members){const label=member.fields.accountCode?.stringValue;if(!label)continue;
     if(!valid(label) || assigned.has(label))throw Error("invalid-or-duplicate-label");
     assigned.add(label);maxima[label[0]]=Math.max(maxima[label[0]],Number(label.slice(1)));
   }
   const writes=[];
   for(const [role,prefix] of Object.entries(prefixes)){
     const name=company.name+"/accountCodeSequences/"+prefix,existing=await get(name);
     const previous=existing?Number(existing.fields?.next?.integerValue):1;
     if(!Number.isSafeInteger(previous) || previous<1)throw Error("invalid-sequence");
     let next=Math.max(previous,maxima[prefix]+1),last=null;
     for(const member of members.filter(m=>m.fields.role?.stringValue===role && !m.fields.accountCode)){
       if(next>999999)throw Error("sequence-exhausted");
       const label=prefix+String(next++).padStart(3,"0");if(assigned.has(label))throw Error("label-conflict");
       assigned.add(label);last=member;stats.newLabels++;
       writes.push({update:{name:member.name,fields:{accountCode:{stringValue:label}}},updateMask:{fieldPaths:["accountCode"]},currentDocument:{updateTime:member.updateTime}});
     }
     if(last){stats.sequenceWrites++;writes.push({update:{name,fields:{next:{integerValue:String(next)},memberId:{stringValue:last.fields.id.stringValue}}},
       currentDocument:existing?{updateTime:existing.updateTime}:{exists:false}});}
     else if(maxima[prefix]>0 && (!existing || previous<=maxima[prefix]))throw Error("existing-label-sequence-needs-review");
   }
   if(apply && writes.length){await client.post(`/v1/projects/${project}/databases/(default)/documents:commit`,{writes});stats.committedCompanies++;}
 }
 console.log(JSON.stringify(stats));
})().catch(error=>{console.error("Account label migration failed:",error.status||error.code||"validation-failed");process.exitCode=1;});
