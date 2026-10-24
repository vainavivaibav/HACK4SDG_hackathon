import {WorkerApp} from '../../../components/worker-app';
export default async function Page({params}:{params:Promise<{id:string}>}){
 const {id}=await params;
 return <WorkerApp screen="reservation" reservationId={id}/>;
}
