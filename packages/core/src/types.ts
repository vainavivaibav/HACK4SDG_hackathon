export type Language='en'|'kn'|'hi';
export type Role='worker'|'host'|'admin';
export interface Profile{id:string;display_name:string;role:Role;language:Language;work_areas:string[];on_duty:boolean}
export interface Venue{id:string;owner_id:string;name:string;area:string;address:string;latitude:number;longitude:number;verification:'pending'|'approved'|'rejected';consent:boolean;created_at:string}
export interface Meal{id:string;venue_id:string;title:string;description:string;diet:'veg'|'nonveg';total_portions:number;reserved_count:number;served_count:number;available_portions:number;cooked_at:string;starts_at:string;ends_at:string;instructions:string;status:'open'|'closed';venue_name:string;area:string;address:string;latitude:number;longitude:number;verification:string;created_at:string;unserved_only:boolean}
export interface Reservation{id:string;worker_id:string;listing_id:string;code:string;status:'active'|'served'|'cancelled'|'expired';created_at:string;expires_at:string;served_at:string|null;served_by:string|null}
export interface Report{id:string;reporter_id:string;listing_id:string;reason:string;status:'open'|'resolved';resolution:string|null;created_at:string}
export interface Activity{id:number;actor_id:string|null;action:string;entity_id:string|null;detail:string;created_at:string}
export interface Feedback{id:string;reservation_id:string;worker_id:string;rating:number;comment:string}
export interface Coords{latitude:number;longitude:number}
export function distanceKm(a:Coords,b:Coords){const rad=(v:number)=>v*Math.PI/180;const dLat=rad(b.latitude-a.latitude),dLon=rad(b.longitude-a.longitude);const h=Math.sin(dLat/2)**2+Math.cos(rad(a.latitude))*Math.cos(rad(b.latitude))*Math.sin(dLon/2)**2;return 6371*2*Math.atan2(Math.sqrt(h),Math.sqrt(Math.max(0,1-h)));}
export function effectiveStatus(r:Reservation,now=Date.now()){return r.status==='active'&&Date.parse(r.expires_at)<=now?'expired':r.status;}
export function isServing(m:Meal,now=Date.now()){return m.status==='open'&&Date.parse(m.starts_at)<=now&&Date.parse(m.ends_at)>now&&m.available_portions>0;}
export function tokenSeconds(r:Reservation,now=Date.now()){return Math.max(0,Math.ceil((Date.parse(r.expires_at)-now)/1000));}
export function qrPayload(r:Reservation){return `hunger:v1:${r.listing_id}:${r.id}`;}
export function parseQr(input:string,listingId:string){const v=input.trim();if(/^\d{4}$/.test(v))return v;const parts=v.split(':');if(parts.length===4&&parts[0]==='hunger'&&parts[1]==='v1'&&parts[2]===listingId&&/^[0-9a-f-]{36}$/i.test(parts[3]))return parts[3];throw new Error('Choose the matching listing and scan a HUNGER QR or enter a four-digit code.');}
export function directions(m:Coords){return `https://www.google.com/maps/dir/?api=1&destination=${m.latitude},${m.longitude}`;}
