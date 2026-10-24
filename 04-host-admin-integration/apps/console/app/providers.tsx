'use client';
import {HungerProvider} from '@hunger/ui';
export function Providers({children}:{children:React.ReactNode}){return <HungerProvider url={process.env.NEXT_PUBLIC_SUPABASE_URL} keyValue={process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY}>{children}</HungerProvider>;}
