// Run against the dedicated Module 13 deployment after configuring three test accounts.
// Credentials come from process environment only. Never print them.
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
const base=process.env.TEST_BASE_URL;
for(const name of ['TEST_BASE_URL','TEST_OWNER_EMAIL','TEST_OWNER_PASSWORD','TEST_OTHER_EMAIL','TEST_OTHER_PASSWORD','TEST_ADMIN_EMAIL','TEST_ADMIN_PASSWORD'])if(!process.env[name])throw new Error(`Missing ${name}`);
async function call(path,method='GET',body,cookie=''){
 const response=await fetch(new URL(`/api/${path}`,base),{method,headers:{origin:new URL(base).origin,'content-type':'application/json',cookie},body:body?JSON.stringify(body):undefined});
 return {status:response.status,data:await response.json(),cookie:response.headers.get('set-cookie')?.split(';')[0]};
}
async function login(role){const result=await call('account','POST',{action:'signin',email:process.env[`TEST_${role}_EMAIL`],password:process.env[`TEST_${role}_PASSWORD`]});assert.equal(result.status,200);assert.ok(result.cookie);return result.cookie;}
const owner=await login('OWNER'),other=await login('OTHER'),admin=await login('ADMIN');
const id=randomUUID();
const created=await call('conversations','POST',{id,question:'What needs to happen before launch?',consent:false},owner);
assert.equal(created.status,201);
assert.equal((await call('conversations','PATCH',{id,version:1,rating:'unhelpful',feedback:'Integration test: please verify source coverage.',flagged:true},other)).status,404);
assert.equal((await call('conversations','PATCH',{id,version:1,rating:'unhelpful',feedback:'Integration test: please verify source coverage.',flagged:true},owner)).status,200);
await call('account','POST',{action:'signout'},owner);
const restored=await login('OWNER');
assert.ok((await call('conversations','GET',undefined,restored)).data.rows.some(row=>row.id===id&&row.flagged));
assert.ok(!(await call('conversations','GET',undefined,other)).data.rows.some(row=>row.id===id));
assert.equal((await call('admin-review','GET',undefined,other)).status,403);
assert.ok((await call('admin-review','GET',undefined,admin)).data.rows.some(row=>row.id===id));
assert.equal((await call('admin-review','PATCH',{id,version:2,note:'Integration check: source coverage reviewed.'},admin)).status,200);
assert.ok((await call('conversations','GET',undefined,restored)).data.rows.some(row=>row.id===id&&row.review_status==='resolved'));
console.log('PASS: persisted conversation and feedback survive sign-out/sign-in; account isolation and admin review verified.');
console.log('A clearly labeled integration-test record remains in the test accounts for audit.');
