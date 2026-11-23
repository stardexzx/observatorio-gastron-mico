import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { MarketError } from '@/db/markets';
export function marketFailure(error:unknown){
 if(error instanceof MarketError)return NextResponse.json({error:error.message},{status:error.status});
 if(error instanceof ZodError){
  const issue=error.issues.find(x=>x.code==='custom');
  const message=issue?.message??(error.issues.some(x=>x.path.includes('postalCode'))?'El código postal debe tener cinco dígitos.':error.issues.some(x=>x.path[0]==='hours')?'Completa los días y las horas de apertura y cierre.':'Revisa los campos obligatorios, la dirección y las fechas.');
  return NextResponse.json({error:message},{status:400});
 }
 const code=(error as {code?:string})?.code;
 if(code==='42501')return NextResponse.json({error:'No tienes permiso para modificar este mercado.'},{status:403});
 if(code==='23503'||code==='23505')return NextResponse.json({error:'Una selección cambió o está repetida. Actualiza el formulario.'},{status:409});
 console.error('API mercados:',error);return NextResponse.json({error:'No se pudo completar la operación. Vuelve a intentarlo.'},{status:500});
}
