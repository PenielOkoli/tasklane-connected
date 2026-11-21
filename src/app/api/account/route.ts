import { z } from 'zod';
import { guarded } from '@/lib/guard';
import { readJSON } from '@/lib/http';
import { ActionError } from '@/lib/engine';
import { accessCookie,authCall,requireUser,isAdmin,tokenFrom } from '@/lib/connected-store';
export const runtime='nodejs';
export const GET=(request:Request)=>guarded(request,async()=>{
 const user=await requireUser(request);return Response.json({user,admin:await isAdmin(user.id)});
});
const credentials=z.object({action:z.enum(['signin','signup','signout']),email:z.string().email().max(254).optional(),password:z.string().min(12).max(128).optional()}).strict();
export const POST=(request:Request)=>guarded(request,async()=>{
 const parsed=credentials.safeParse(await readJSON(request));
 if(!parsed.success)throw new ActionError(400,'Use a valid email and a password of 12 to 128 characters.');
 const {action,email,password}=parsed.data;
 if(action==='signout'){
  const token=tokenFrom(request);if(token)await authCall('logout',{},token).catch(()=>{});
  return Response.json({message:'Signed out.'},{headers:{'Set-Cookie':accessCookie('',0)}});
 }
 if(!email||!password)throw new ActionError(400,'Email and password are required.');
 const data=await authCall(action==='signup'?'signup':'token?grant_type=password',{email,password});
 if(!data.access_token)return Response.json({message:'Check your email to confirm your account, then sign in.'});
 return Response.json({message:'Signed in.'},{headers:{'Set-Cookie':accessCookie(data.access_token,data.expires_in)}});
});
