import type {Metadata} from 'next';
import '@hunger/ui/src/styles.css';
import './web.css';
import {Providers} from './providers';
export const metadata:Metadata={title:'HUNGER - Good food. Shared.',description:'Find free meals at nearby venues. A community surplus food platform for the people who keep our communities moving.'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body><Providers>{children}</Providers></body></html>;}
