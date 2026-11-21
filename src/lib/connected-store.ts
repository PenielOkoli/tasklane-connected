import 'server-only';
import { ActionError } from './engine';
import type { Answer } from './knowledge';
export type Conversation = { id:string; user_id:string; question:string; answer:Answer; created_at:string; rating:'helpful'|'unhelpful'|null; feedback:string; flagged:boolean; needs_review:boolean; review_status:'pending'|'resolved'; review_note:string; version:number };
function config(){
 const url=process.env.SUPABASE_URL, anon=process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, service=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!anon||!service)throw new ActionError(503,'Account storage is not configured yet.');
 return {url:url.replace(/\/$/,''),anon,service};
}
export async function authCall(path:string,body?:unknown,token?:string){
 const {url,anon}=config();
 const response=await fetch(`${url}/auth/v1/${path}`,{method:body===undefined?'GET':'POST',headers:{apikey:anon,'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},body:body===undefined?undefined:JSON.stringify(body),cache:'no-store',signal:AbortSignal.timeout(12000)});
 if(!response.ok)throw new ActionError(response.status===429?429:401,response.status===429?'Too many account requests. Try again later.':'Sign-in could not be verified. Check your credentials and email confirmation.');
 return response.status===204?{}:await response.json();
}
export function accessCookie(token:string,age=3600){
 if(!/^[A-Za-z0-9._-]*$/.test(token))throw new ActionError(500,'Invalid session response.');
 return `tasklane_access=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${Math.min(age,3600)}${process.env.NODE_ENV==='production'?'; Secure':''}`;
}
export function tokenFrom(request:Request){return request.headers.get('cookie')?.split(';').map(x=>x.trim()).find(x=>x.startsWith('tasklane_access='))?.slice(16);}
export async function requireUser(request:Request):Promise<{id:string;email:string}>{
 const token=tokenFrom(request);
 if(!token)throw new ActionError(401,'Sign in to open your saved workspace.');
 const user=await authCall('user',undefined,token);
 if(!user.id||!user.email)throw new ActionError(401,'Sign in again.');
 return {id:user.id,email:user.email};
}
export async function db<T>(path:string,method='GET',body?:unknown):Promise<T>{
 const {url,service}=config();
 const response=await fetch(`${url}/rest/v1/${path}`,{method,headers:{apikey:service,Authorization:`Bearer ${service}`,'Content-Type':'application/json',Prefer:'return=representation'},body:body===undefined?undefined:JSON.stringify(body),cache:'no-store',signal:AbortSignal.timeout(12000)});
 if(!response.ok){
  const details=await response.json().catch(()=>({}));
  if(response.status===409||details.code==='40001')throw new ActionError(409,'This record changed. Refresh and try again.');
  throw new ActionError(503,'The database could not complete this request. Your changes are not confirmed saved.');
 }
 return response.status===204?undefined as T:await response.json();
}
export async function isAdmin(id:string){return (await db<{user_id:string}[]>(`workspace_admins?user_id=eq.${encodeURIComponent(id)}&select=user_id`)).length===1;}
export async function owned(id:string,user:string){
 const rows=await db<Conversation[]>(`conversations?id=eq.${encodeURIComponent(id)}&user_id=eq.${encodeURIComponent(user)}&limit=1`);
 if(!rows[0])throw new ActionError(404,'Conversation not found.');
 return rows[0];
}
