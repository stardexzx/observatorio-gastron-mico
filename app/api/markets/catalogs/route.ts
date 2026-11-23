import {NextRequest,NextResponse} from 'next/server';
import {getSessionUser} from '@/lib/auth/session';
import {localOnly} from '@/lib/api-demo';
import {marketFailure} from '@/lib/market-api';
import {marketCatalogs} from '@/db/markets';
export const runtime='nodejs';export const dynamic='force-dynamic';
export async function GET(request:NextRequest){try{
 const user=await getSessionUser();if(!user)return NextResponse.json({error:'Inicia sesión para continuar.'},{status:401});
 const denied=localOnly(request);if(denied)return denied;
 return NextResponse.json({catalogs:await marketCatalogs(user.id)});
}catch(error){return marketFailure(error);}}
