// Route integration with an explicit Supabase HTTP double, NOT database evidence.
import test from 'node:test';
import assert from 'node:assert/strict';
import {GET,POST,PATCH} from '../src/app/api/conversations/route';
import {GET as queue,PATCH as review} from '../src/app/api/admin-review/route';
import {GET as account} from '../src/app/api/account/route';
process.env.SESSION_SECRET='integration-only-key-not-a-production-secret';
process.env.SUPABASE_URL='https://database.test';
process.env.SUPABASE_ANON_KEY='test-anon';
process.env.SUPABASE_SERVICE_ROLE_KEY='test-service';
const id='5fcfc371-7bca-4838-b1ec-d31c19560997';
function request(path:string,method='GET',body?:unknown,token='owner'){return new Request(`https://app.test/api/${path}`,{method,headers:{origin:'https://app.test','content-type':'application/json',cookie:`tasklane_access=${token}`},body:body?JSON.stringify(body):undefined});}
test('account -> save -> reread -> feedback -> admin review, with ownership and stale-write rejection',async()=>{
 const original=globalThis.fetch;let saved:any=null;let audit=0;
 globalThis.fetch=async(input,init)=>{
  const url=new URL(String(input));const headers=new Headers(init?.headers);
  if(url.pathname==='/auth/v1/user')return Response.json({id:headers.get('authorization')?.replace('Bearer ','')||'unknown',email:'test@example.invalid'});
  assert.equal(headers.get('authorization'),'Bearer test-service');
  if(url.pathname.endsWith('workspace_admins'))return Response.json(url.searchParams.get('user_id')==='eq.admin'?[{user_id:'admin'}]:[]);
  if(url.pathname.endsWith('rpc/review_conversation')){const data=JSON.parse(String(init?.body));assert.equal(data.p_actor,'admin');if(data.p_version!==saved.version)return Response.json({code:'40001'},{status:409});saved={...saved,review_status:'resolved',review_note:data.p_note,version:saved.version+1};audit++;return Response.json([saved]);}
  assert.equal(url.pathname,'/rest/v1/conversations');
  const owner=url.searchParams.get('user_id');
  if(init?.method==='POST'){saved={...JSON.parse(String(init.body)),created_at:new Date().toISOString(),rating:null,feedback:'',flagged:false,review_status:'pending',review_note:'',version:1};return Response.json([saved],{status:201});}
  const found=saved&&(!owner||owner===`eq.${saved.user_id}`);
  if(init?.method==='PATCH'){if(!found||url.searchParams.get('version')!==`eq.${saved.version}`)return Response.json([]);saved={...saved,...JSON.parse(String(init.body))};return Response.json([saved]);}
  return Response.json(found?[saved]:[]);
 };
 try{
  assert.equal((await account(request('account'))).status,200);
  const body={id,question:'What needs to happen before launch?',consent:false};
  assert.equal((await POST(request('conversations','POST',body))).status,201);
  assert.equal((await POST(request('conversations','POST',body))).status,200);
  assert.equal((await (await GET(request('conversations'))).json()).rows[0].question,body.question);
  assert.equal((await (await GET(request('conversations','GET',undefined,'other'))).json()).rows.length,0);
  const feedback={id,version:1,rating:'unhelpful',feedback:'Please check this answer.',flagged:true};
  assert.equal((await PATCH(request('conversations','PATCH',feedback,'other'))).status,404);
  assert.equal((await PATCH(request('conversations','PATCH',feedback))).status,200);
  assert.equal((await PATCH(request('conversations','PATCH',feedback))).status,409);
  assert.equal((await queue(request('admin-review'))).status,403);
  assert.equal((await review(request('admin-review','PATCH',{id,version:2,note:'Checked evidence.'}))).status,403);
  assert.equal((await (await queue(request('admin-review','GET',undefined,'admin'))).json()).rows[0].feedback,feedback.feedback);
  assert.equal((await review(request('admin-review','PATCH',{id,version:2,note:'Checked evidence.'},'admin'))).status,200);
  assert.equal(audit,1);
  assert.equal((await (await GET(request('conversations'))).json()).rows[0].review_status,'resolved');
  assert.equal((await review(request('admin-review','PATCH',{id,version:2,note:'Stale review.'},'admin'))).status,409);
 }finally{globalThis.fetch=original;}
});
test('unauthenticated and cross-origin writes fail before storage access',async()=>{
 assert.equal((await GET(new Request('https://app.test/api/conversations'))).status,401);
 assert.equal((await POST(new Request('https://app.test/api/conversations',{method:'POST',headers:{origin:'https://evil.test'}}))).status,403);
});
test('storage failure never returns a successful save',async()=>{
 const original=globalThis.fetch;
 globalThis.fetch=async(input,init)=>String(input).includes('/auth/v1/user')?Response.json({id:'owner',email:'test@example.invalid'}):init?.method==='GET'?Response.json([]):Response.json({},{status:503});
 try{assert.equal((await POST(request('conversations','POST',{id,question:'What needs to happen before launch?',consent:false}))).status,503);}finally{globalThis.fetch=original;}
});
