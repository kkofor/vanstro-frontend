import { prisma, type PrismaClient } from "@vanstro/db";
import { S03_COMPILED_VALUE, type CommerceSettingsValueV1 } from "../../dashboard/s03-settings.js";

type PolicyDatabase = Pick<PrismaClient, "runtimeConfigVersion">;
export type ResolvedCommercePolicy = { value: CommerceSettingsValueV1; generation: number; projectionState: "compiled_default" | "published" };
/** Resolve exactly once at each commerce operation boundary and pass the result down. */
export async function resolveCommercePolicy(database:PolicyDatabase=prisma):Promise<ResolvedCommercePolicy>{
 const row=await database.runtimeConfigVersion.findFirst({where:{configKey:"settings.commerce",settingsLifecycleStatus:"published"},orderBy:{settingsRevision:"desc"}});
 if(!row)return{value:S03_COMPILED_VALUE,generation:0,projectionState:"compiled_default"};
 return{value:row.effectiveValue as CommerceSettingsValueV1,generation:Number(row.generation),projectionState:"published"};
}
export function assertCommerceQuoteAllowed(policy:ResolvedCommercePolicy,input:{guest:boolean;subtotalCents:number;province:string;fulfillment:"pickup"|"delivery"},options?:{skipTax?:boolean}){
 const {value}=policy;if(!value.commercePolicy.checkoutEnabled)return"CHECKOUT_DISABLED";
 if(input.guest&&!value.commercePolicy.guestCheckoutEnabled)return"GUEST_CHECKOUT_DISABLED";
 if(input.subtotalCents<value.commercePolicy.minimumOrderAmountCents)return"MINIMUM_ORDER_NOT_MET";
 if(!options?.skipTax&&value.taxPolicy.calculationMode!=="disabled"&&value.taxPolicy.enabledProvinceCodes.length>0&&!value.taxPolicy.enabledProvinceCodes.includes(input.province))return"TAX_PROVINCE_DISABLED";
 if(input.fulfillment==="pickup"&&!value.shippingPolicy.pickupEnabled)return"PICKUP_DISABLED";
 if(input.fulfillment==="delivery"&&!value.shippingPolicy.deliveryEnabled)return"DELIVERY_DISABLED";
}
export function commerceInventoryProjection(policy:ResolvedCommercePolicy){return{generation:policy.generation,...policy.value.inventoryPolicy};}
export function commerceOrderTransitionAllowed(policy:ResolvedCommercePolicy,from:keyof CommerceSettingsValueV1["orderPolicy"]["allowedLifecycleTransitions"],to:string){return policy.value.orderPolicy.allowedLifecycleTransitions[from].includes(to as never);}
export function quoteCommerceSandbox(policy:ResolvedCommercePolicy,input:{subtotalCents:number;combinedTaxRate:number;province:string;fulfillment:"pickup"|"delivery";guest:boolean}){
 const denied=assertCommerceQuoteAllowed(policy,input);if(denied)return{ok:false as const,reasonCode:denied,generation:policy.generation};
 const taxCents=policy.value.taxPolicy.calculationMode==="disabled"?0:Math.round(input.subtotalCents*input.combinedTaxRate);
 const shippingCents=input.fulfillment==="delivery"?policy.value.shippingPolicy.deliveryFlatFeeCents:0;
 return{ok:true as const,generation:policy.generation,taxCents,shippingCents,totalCents:input.subtotalCents+taxCents+shippingCents};
}
