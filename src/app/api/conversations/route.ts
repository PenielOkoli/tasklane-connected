import { z } from 'zod';
import { guarded } from '@/lib/guard';
import { readJSON } from '@/lib/http';
import { ActionError } from '@/lib/engine';
import { db,owned,requireUser,type Conversation } from '@/lib/connected-store';
import { connectedAnswer } from '@/lib/connected-answer';
export const runtime='nodejs';
export const maxDuration=60;
const createSchema=z.object({id:z.uuid(),question:z.string().trim().min(3).max(600),consent:z.boolean()}).strict();
const feedbackSchema=z.object({id:z.uuid(),version:z.number().int().positive(),rating:z.enum(['helpful','unhelpful']),feedback:z.string().trim().max(1000),flagged:z.boolean()}).strict();
export const GET=(request:Request)=>guarded(request,async()=>{
 const user=await requireUser(request);
 const page=Number(new URL(request.url).searchParams.get('page')||0);
 if(!Number.isInteger(page)||page<0||page>10000)throw new ActionError(400,'Invalid page.');
 const rows=await db<Conversation[]>(`conversations?user_id=eq.${encodeURIComponent(user.id)}&order=created_at.desc,id.desc&limit=21&offset=${page*20}`);
 return Response.json({rows:rows.slice(0,20),hasMore:rows.length>20});
});
export const POST=(request:Request)=>guarded(request,async()=>{
 const user=await requireUser(request),parsed=createSchema.safeParse(await readJSON(request));
 if(!parsed.success)throw new ActionError(400,'Enter a question between 3 and 600 characters.');
 const {id,question,consent}=parsed.data;
 const previous=await db<Conversation[]>(`conversations?id=eq.${id}&user_id=eq.${encodeURIComponent(user.id)}`);
 if(previous[0]){
  if(previous[0].question!==question)throw new ActionError(409,'This request ID already belongs to another question.');
  return Response.json({record:previous[0]});
 }
 const answer=await connectedAnswer(question,consent,request);
 const rows=await db<Conversation[]>('conversations','POST',{id,user_id:user.id,question,answer,needs_review:consent&&answer.status!=='answered'});
 return Response.json({record:rows[0]},{status:201});
});
export const PATCH=(request:Request)=>guarded(request,async()=>{
 const user=await requireUser(request),parsed=feedbackSchema.safeParse(await readJSON(request));
 if(!parsed.success)throw new ActionError(400,'Choose a rating and keep feedback within 1,000 characters.');
 const {id,version,rating,feedback,flagged}=parsed.data;
 const existing=await owned(id,user.id);
 const rows=await db<Conversation[]>(`conversations?id=eq.${id}&user_id=eq.${encodeURIComponent(user.id)}&version=eq.${version}`,'PATCH',{rating,feedback,flagged,needs_review:existing.needs_review||flagged||rating==='unhelpful',review_status:'pending',review_note:'',version:version+1});
 if(!rows[0])throw new ActionError(409,'This conversation changed. Refresh before saving feedback.');
 return Response.json({record:rows[0]});
});
