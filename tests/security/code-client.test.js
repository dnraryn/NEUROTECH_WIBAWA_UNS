const {test,after}=require('node:test');
const assert=require('node:assert/strict');
const {webcrypto}=require('node:crypto');
const sdk=require('firebase/compat/app');
require('firebase/compat/auth');require('firebase/compat/firestore');
const {browser}=require('../helpers');
const {ntCreateCompanyStore}=require('../../company-store');
after(async()=>{await Promise.all(sdk.apps.map(app=>app.delete()));});
const waitFor=async condition=>{for(let i=0;i<150;i++){if(condition())return;await new Promise(r=>setTimeout(r,30));}throw Error('client state timeout');};

test('real client registers owner and required team, then logs in by code without member email verification',async()=>{
 assert.ok(process.env.FIRESTORE_EMULATOR_HOST);assert.ok(process.env.FIREBASE_AUTH_EMULATOR_HOST);
 const b=browser(),c=b.c;c.crypto=webcrypto;c.TextEncoder=TextEncoder;c.URLSearchParams=URLSearchParams;
 c.location={hostname:'localhost',search:'?emulators=1'};
 let verificationRequests=0;
 const authFactory=()=>{const auth=sdk.auth();auth.setPersistence=async()=>{};
   if(!auth.fixtureCreate){auth.fixtureCreate=auth.createUserWithEmailAndPassword.bind(auth);auth.createUserWithEmailAndPassword=async(...args)=>{const result=await auth.fixtureCreate(...args);result.user.sendEmailVerification=async()=>{verificationRequests++;};return result;};}return auth;};
 authFactory.Auth=sdk.auth.Auth;authFactory.EmailAuthProvider=sdk.auth.EmailAuthProvider;
 c.firebase={initializeApp:(...args)=>sdk.initializeApp(...args),app:()=>sdk.app(),auth:authFactory,firestore:sdk.firestore};
 c.ntCreateCompanyStore=ntCreateCompanyStore;b.load('portal-access.js');b.load('firebase-init.js');
 await waitFor(()=>!c.ntAuth.loading);
 const email='client-owner-'+Date.now()+'@example.test', password='fixture-owner-password-1';
 const user=await c.ntAuth.signUp({name:'Company owner',email,password});
 assert.equal(verificationRequests,1);
 const data={pkg:'bronze',companyName:'Client code onboarding',ownerName:'Owner',team:[
   {role:'supervisor',name:'Supervisor',password:'fixture-supervisor-1'},
   {role:'pekerja',name:'Worker',password:'fixture-worker-1'},
 ]};
 await assert.rejects(c.ntCompany.create({...data,team:[]}),/supervisor/);
 await assert.rejects(c.ntCompany.create(data),/Verifikasi/);
 const verified=await fetch('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/projects/demo-neurotech/accounts:update',{
   method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer owner'},body:JSON.stringify({localId:user.uid,emailVerified:true})});
 assert.equal(verified.ok,true);await c.ntAuth.verify();
 const companyCode=await c.ntCompany.create(data),session=c.ntSession.get();
 assert.equal(session.uid,user.uid);assert.equal(session.members.length,3);assert.equal(session.role,'management');
 assert.equal(sdk.apps.length,1,'provisioning must retain only the owner app');
 const worker=session.members.find(m=>m.role==='pekerja'),supervisor=session.members.find(m=>m.role==='supervisor');
 assert.ok(worker.loginCode);assert.ok(supervisor.loginCode);assert.equal(worker.status,'invited');
 assert.equal(worker.accountCode,'P001');assert.equal(supervisor.accountCode,'S001');assert.equal(session.accountCode,'M001');
 assert.equal(JSON.stringify(session).includes('fixture-worker-1'),false);
 const ownerCode=session.loginCode;
 const additional=await c.ntCompany.addCodeMember({name:'Second worker',role:'pekerja',password:'fixture-add-worker-1',shift:'Sore'});
 assert.equal(sdk.auth().currentUser.uid,user.uid,'adding accounts must not switch the owner Auth session');
 assert.equal(c.ntSession.get().members.length,4);assert.ok(additional.loginCode);
 assert.equal(additional.accountCode,'P002');
 await c.ntAuth.signOut();
 const workerSession=await c.ntAuth.signInCode({code:c.ntPortal.formatLoginCode(worker.loginCode),accountCode:'P001',companyCode,password:'fixture-worker-1'});
 assert.equal(workerSession.code,companyCode);assert.equal(workerSession.role,'pekerja');assert.equal(workerSession.members.length,1);
 assert.equal(sdk.auth().currentUser.emailVerified,false);
 assert.equal(c.ntPortal.savedAccounts().find(a=>a.loginCode===worker.loginCode).accountCode,'P001');
 await assert.rejects(c.ntCompany.recoverOwnerCode(),/pemilik/);
 await c.ntAuth.changePassword('fixture-worker-1','fixture-worker-new-2');await c.ntAuth.signOut();
 await assert.rejects(c.ntAuth.signInCode({code:worker.loginCode,password:'fixture-worker-1'}));
 assert.equal(c.ntSession.get(),null);
 await c.ntAuth.signInCode({code:worker.loginCode,password:'fixture-worker-new-2'});await c.ntAuth.signOut();
 const staffSession=await c.ntAuth.signInCode({code:supervisor.loginCode,password:'fixture-supervisor-1'});
 assert.equal(staffSession.role,'supervisor');assert.equal(staffSession.members.length,4);
 await c.ntAuth.signOut();const restoredOwner=await c.ntAuth.signInCode({code:ownerCode,password});
 assert.equal(restoredOwner.role,'management');assert.equal(restoredOwner.uid,user.uid);
 assert.equal(await c.ntCompany.recoverOwnerCode(),companyCode);assert.equal(c.ntSession.get().loginCode,ownerCode);
 const codes=await fetch('http://127.0.0.1:9099/emulator/v1/projects/demo-neurotech/oobCodes').then(r=>r.json());
 assert.equal((codes.oobCodes||[]).filter(code=>code.email?.endsWith('@members.neurotech.invalid')).length,0);
 await c.ntAuth.signOut();
});
