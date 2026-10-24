import {createClient,type SupabaseClient,type SupabaseClientOptions} from '@supabase/supabase-js';
import type {Meal,Profile,Reservation,Venue,Report,Activity,Feedback} from './types';
import {authSchema,profileSchema,venueSchema,listingSchema,feedbackSchema,errorMessage} from './validation';
export function createHungerClient(url:string,key:string,options?:SupabaseClientOptions<'public'>){return createClient(url,key,options);}
export class HungerApi{
 constructor(readonly client:SupabaseClient){}
 private async query<T>(query:PromiseLike<{data:unknown;error:unknown}>):Promise<T>{const{data,error}=await query;if(error)throw new Error(errorMessage(error));if(data&&typeof data==='object'&&'error'in data)throw new Error(errorMessage(new Error(String(data.error))));return data as T;}
 rpc<T=void>(name:string,args?:Record<string,unknown>){return this.query<T>(this.client.rpc(name,args));}
 meals(){return this.query<Meal[]>(this.client.from('meal_feed').select('*').order('starts_at',{ascending:true}));}
 profile(id:string){return this.query<Profile>(this.client.from('profiles').select('*').eq('id',id).single());}
 updateProfile(id:string,input:unknown){return this.query<Profile>(this.client.from('profiles').update(profileSchema.parse(input)).eq('id',id).select().single());}
 async signIn(email:string,password:string){const v=authSchema.parse({email,password});const{data,error}=await this.client.auth.signInWithPassword(v);if(error)throw error;return data;}
 async signUp(email:string,password:string,name:string){const v=authSchema.parse({email,password});const{data,error}=await this.client.auth.signUp({...v,options:{data:{display_name:name.slice(0,80)}}});if(error)throw error;return data;}
 async signOut(){const{error}=await this.client.auth.signOut();if(error)throw error;}
 refresh(){return this.rpc('refresh_expired');}
 reservations(){return this.query<Reservation[]>(this.client.from('reservations').select('*').order('created_at',{ascending:false}));}
 reserve(id:string){return this.rpc<Reservation>('reserve_meal',{p_listing:id});}
 cancel(id:string){return this.rpc<Reservation>('cancel_reservation',{p_reservation:id});}
 serve(id:string,token:string){return this.rpc<Reservation>('serve_meal',{p_listing:id,p_token:token});}
 venues(){return this.query<Venue[]>(this.client.from('venues').select('*').order('created_at',{ascending:false}));}
 applyVenue(input:unknown){return this.rpc<Venue>('apply_venue',{p_data:venueSchema.parse(input)});}
 saveListing(input:unknown,id:string|null=null){return this.rpc<Meal>('save_listing',{p_data:listingSchema.parse(input),p_id:id});}
 closeListing(id:string){return this.rpc('close_listing',{p_listing:id});}
 reviewVenue(id:string,approve:boolean,note:string){return this.rpc('review_venue',{p_venue:id,p_approve:approve,p_note:note});}
 async uploadDocument(userId:string,file:File){if(!['image/jpeg','image/png','application/pdf'].includes(file.type)||file.size>5242880)throw new Error('Upload a PDF, PNG or JPEG under 5 MB.');const path=`${userId}/${crypto.randomUUID()}`;const{error}=await this.client.storage.from('venue-documents').upload(path,file,{contentType:file.type,upsert:false});if(error)throw error;return path;}
 async documentUrl(venueId:string){const path=await this.rpc<string|null>('venue_document',{p_venue:venueId});if(!path)return null;const{data,error}=await this.client.storage.from('venue-documents').createSignedUrl(path,60);if(error)throw error;return data.signedUrl;}
 reports(){return this.query<Report[]>(this.client.from('reports').select('*').order('created_at',{ascending:false}));}
 report(id:string,reason:string){return this.rpc('report_listing',{p_listing:id,p_reason:reason});}
 resolveReport(id:string,note:string){return this.rpc('resolve_report',{p_report:id,p_note:note});}
 feedback(){return this.query<Feedback[]>(this.client.from('feedback').select('*'));}
 leaveFeedback(input:unknown){const v=feedbackSchema.parse(input);return this.rpc('submit_feedback',{p_reservation:v.reservation_id,p_rating:v.rating,p_comment:v.comment});}
 activity(){return this.query<Activity[]>(this.client.from('activity').select('*').order('created_at',{ascending:false}).limit(100));}
 subscribe(onChange:()=>void,onStatus?:(status:string)=>void){const channel=this.client.channel(`hunger-${Math.random().toString(36).slice(2)}`);for(const table of ['listings','reservations','venues'])channel.on('postgres_changes',{event:'*',schema:'public',table},onChange);channel.subscribe(s=>onStatus?.(s));return()=>{void this.client.removeChannel(channel);};}
}
