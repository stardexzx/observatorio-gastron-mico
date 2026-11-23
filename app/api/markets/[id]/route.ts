import {NextRequest,NextResponse} from 'next/server';
import {getSessionUser} from '@/lib/auth/session';
import {localOnly} from '@/lib/api-demo';
import {marketFailure} from '@/lib/market-api';
import {getMarket,saveMarket} from '@/db/markets';
export const runtime='nodejs';export const dynamic='force-dynamic';
type Context={params:Promise<{id:string}>};
export async function GET(request:NextRequest,{params}:Context){try{
 const user=await getSessionUser();if(!user)return NextResponse.json({error:'Inicia sesión para continuar.'},{status:401});
 const denied=localOnly(request);if(denied)return denied;
 const market=await getMarket((await params).id,user.id);
 return market?NextResponse.json({market}):NextResponse.json({error:'Mercado no encontrado.'},{status:404});
}catch(error){return marketFailure(error);}}
export async function PUT(request:NextRequest,{params}:Context){try{
 const user=await getSessionUser();if(!user)return NextResponse.json({error:'Inicia sesión para continuar.'},{status:401});
 const denied=localOnly(request,true);if(denied)return denied;
 return NextResponse.json({market:await saveMarket(await request.json(),(await params).id,user.id)});
}catch(error){return marketFailure(error);}}
