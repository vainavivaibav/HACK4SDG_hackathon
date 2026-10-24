import type {Metadata} from 'next';
import '@hunger/ui/src/styles.css';
import './console.css';
import {Providers} from './providers';
export const metadata:Metadata={title:'HUNGER - Host & community console',description:'Coordinate surplus food, manage serving counters and review venues.'};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="en"><body><Providers>{children}</Providers></body></html>;}
