import { z } from 'zod';
import { guarded } from '@/lib/guard';
import { readJSON } from '@/lib/http';
import { ActionError } from '@/lib/engine';
import { db,requireUser,isAdmin,type Conversation } from '@/lib/connected-store';
export const runtime='nodejs';
async function admin(request:Request){const user=await requireUser(request);if(!await isAdmin(user.id))throw new ActionError(403,'Administrator access is required.');return user;}
export const GET=(request:Request)=>guarded(request,async()=>{
 await admin(request);
 const page=Number(new URL(request.url).searchParams.get('page')||0);
 if(!Number.isInteger(page)||page<0||page>10000)throw new ActionError(400,'Invalid page.');
 const rows=await db<Conversation[]>(`conversations?needs_review=eq.true&order=review_status.asc,created_at.desc,id.desc&limit=21&offset=${page*20}`);
 return Response.json({rows:rows.slice(0,20),hasMore:rows.length>20});
});
const schema=z.object({id:z.uuid(),version:z.number().int().positive(),note:z.string().trim().min(5).max(1000)}).strict();
export const PATCH=(request:Request)=>guarded(request,async()=>{
 const user=await admin(request),parsed=schema.safeParse(await readJSON(request));
 if(!parsed.success)throw new ActionError(400,'Add a review note between 5 and 1,000 characters.');
 const {id,version,note}=parsed.data;
 const rows=await db<Conversation[]>('rpc/review_conversation','POST',{p_id:id,p_actor:user.id,p_version:version,p_note:note});
 return Response.json({record:rows[0]});
});
