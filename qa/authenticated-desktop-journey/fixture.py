#!/usr/bin/env python3
import json, sys, uuid, urllib.parse, threading
from datetime import datetime, timezone, timedelta
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler
PORT=int(sys.argv[1]); WEB_ORIGIN=sys.argv[2]; ACTOR=str(uuid.uuid4()); IMP='imp_'+uuid.uuid4().hex[:12]; TOKEN='opaque-'+uuid.uuid4().hex
release_event=threading.Event()

JOB_ID="123e4567-e89b-42d3-a456-426614174010"
WORK_ID="123e4567-e89b-42d3-a456-426614174020"
NOTICE_ID="123e4567-e89b-42d3-a456-426614174021"
MEDIA_ID="123e4567-e89b-42d3-a456-426614174030"
VARIANT_ID="123e4567-e89b-42d3-a456-426614174031"
AUDIT_ID="123e4567-e89b-42d3-a456-426614174040"
def cursor_meta(profile,sort): return {'requestId':'fixture-request','queryContractVersion':'common-query.v1','pagination':{'mode':'cursor','limit':50,'hasMore':False},'sort':sort,'snapshot':{'consistency':'statement','capturedAt':now()},'visibility':{'profileId':profile}}
def job(): return {'id':JOB_ID,'contractVersion':'async-job.v1','jobType':'foundation.probe','jobTypeVersion':'foundation.probe.v1','typeLabel':'基础设施验证任务','status':'running','createdAt':now(),'updatedAt':now(),'startedAt':now(),'createdBy':{'actorType':'admin_user'},'authorizationScope':{'kind':'global'},'progress':{'kind':'current_total','current':2,'total':5,'stage':'execute','updatedAt':now()},'processedCount':2,'failedCount':0,'totalCount':5,'attempt':1,'maxAttempts':3,'heartbeatAt':now(),'cancellable':True,'retryable':False,'artifacts':[],'expiresAt':(datetime.now(timezone.utc)+timedelta(days=7)).isoformat().replace('+00:00','Z'),'requestId':'fixture-job','version':2}
def work_item(): return {'id':WORK_ID,'contractVersion':'work-queue-item.v1','type':'foundation.attention','typeVersion':'foundation.attention.v1','typeLabel':'基础设施关注事项','title':'关注验证任务','safeSummary':{'schemaVersion':'work-queue-foundation-summary.v1','entries':{'stage':'execute','issueCode':'probe_warning'}},'severity':'warning','status':'open','health':'fresh','source':'async_job','resource':{'type':'async_job','id':JOB_ID},'deepLink':'/dashboard/operations?view=jobs','createdAt':now(),'updatedAt':now(),'lastObservedAt':now(),'dueAt':(datetime.now(timezone.utc)+timedelta(hours=4)).isoformat().replace('+00:00','Z'),'authorizationScope':{'kind':'global'},'occurrence':1,'capabilities':{'assign':False,'acknowledge':False,'resolve':False,'dismiss':False,'reopen':False},'requestId':'fixture-work','version':1}
def notice(): return {'id':NOTICE_ID,'contractVersion':'in-app-notification.v1','type':'foundation.attention.critical','typeVersion':'foundation.attention.critical.v1','title':'严重事项','safeMessage':{'schemaVersion':'work-queue-safe-summary.v1','entries':{'issueCode':'critical'}},'severity':'critical','recipient':{'userId':ACTOR},'workItem':{'id':WORK_ID,'type':'foundation.attention'},'resource':{'type':'async_job','id':JOB_ID},'authorizationScope':{'kind':'global'},'createdAt':now(),'expiresAt':(datetime.now(timezone.utc)+timedelta(days=30)).isoformat().replace('+00:00','Z'),'version':1}
def media(): return {'id':MEDIA_ID,'contractVersion':'media-asset.v1','kind':'image','status':'processing','safeDisplayName':'fixture.jpg','decorative':False,'accessibilityComplete':False,'locales':[{'locale':'en-CA','altText':'Fixture','caption':None},{'locale':'fr-CA','altText':'Fixture','caption':None}],'credit':None,'copyright':None,'tags':['fixture'],'provenanceOrigin':'human_upload','source':'dashboard_upload','authorizationScope':{'kind':'global'},'createdAt':now(),'updatedAt':now(),'usage':{'count':0},'variants':[{'id':VARIANT_ID,'role':'original','status':'processing','contentType':'image/jpeg'}],'version':1,'requestId':'fixture-media','capabilities':{'update':False,'archive':False,'restore':False,'downloadOriginal':False,'manageVariants':False}}
def media_result():
    captured=now(); meta=cursor_meta('dashboard.media-assets.safe.v1',[{'field':'createdAt','direction':'desc','nulls':'last'},{'field':'recordId','direction':'desc','nulls':'last'}]); meta['snapshot']['capturedAt']=captured
    return {'data':[media()],'meta':meta,'summary':{'data':{'total':1,'byStatus':{'processing':1},'byKind':{'image':1}},'relation':'exact','capturedAt':captured,'profileId':'dashboard.media-assets.safe.v1'}}
def audit(): return {'id':AUDIT_ID,'eventVersion':'audit-event.v1','occurredAt':now(),'actor':{'type':'admin_user','displayClass':'staff','id':ACTOR},'authorization':{'effectiveRoles':[{'roleKey':'qa','scope':'global'}],'permissionGrants':[{'permissionKey':'audit_logs.read','scope':{'kind':'global'}}],'scope':{'kind':'global'},'contextRevision':'fixture','contractVersion':'dashboard-authorization.v1'},'action':'create','resource':{'type':'category','id':MEDIA_ID},'result':'succeeded','requestId':'fixture-audit','source':'dashboard_api','sensitive':False,'changeSummary':{'changedFields':['status'],'redactedFields':[]}}
def now(): return datetime.now(timezone.utc).isoformat().replace('+00:00','Z')
state={'requests':[],'profile':'full','context':1,'importStatus':None,'jobs':0,'artifacts':0,'finalizeIdentity':None,'p09Delay':False,'p09Mode':'normal','p10Mode':'multiple','authenticated':False}
def action(key): return {'action':'read','permissionKey':key,'decision':'allow','reason':'granted_by_persisted_permission','scope':{'kind':'global'}}
def foundation(): return {'data':{'contractVersion':'dashboard-foundation.v1','actor':{'id':ACTOR,'displayLabel':'Cross F1 QA','roleLabels':['qa']},'modules':[{'module':'overview','route':'/dashboard','readAllowed':True},{'module':'content','route':'/dashboard/content','readAllowed':True},{'module':'operations','route':'/dashboard/operations','readAllowed':True},{'module':'audit','route':'/dashboard/audit','readAllowed':True}],'visibility':{'scope':'unavailable','fields':'permission-only'},'shell':{'flag':'dashboard.shell.v2','mode':'internal','enabled':True,'code':'DASHBOARD_SHELL_READY','readOnly':True},'readiness':'ready','requestId':f"f-{state['context']}"}}
def authorization():
    disabled={'enabled':False}; profile=state['profile']; base=['dashboard.access']; content=[] if profile=='denied-p08' else ['content.read','dashboard.import.foundation_sample.read','dashboard.import.foundation_sample.create','dashboard.import.foundation_sample.commit','dashboard.export.foundation_sample.read','dashboard.export.foundation_sample.create','dashboard.export.foundation_sample.download']; ops=[]
    if profile not in ('denied-p09','denied-all'): ops += ['config.read','flags.read','readiness.read_summary','readiness.read_detail']
    if profile not in ('denied-p10','denied-all'): ops += ['analytics.release.read']
    modules=[{'module':'overview','route':'/dashboard','status':'allowed','actions':[action(x) for x in base]},{'module':'content','route':'/dashboard/content','status':'allowed','actions':[action(x) for x in content]},{'module':'operations','route':'/dashboard/operations','status':'allowed','actions':[action(x) for x in ops]},{'module':'audit','route':'/dashboard/audit','status':'allowed','actions':[action('audit_logs.read')]}]
    return {'data':{'contractVersion':'dashboard-authorization.v1','status':'ready','requestId':f"a-{state['context']}",'issuedAt':now(),'expiresAt':(datetime.now(timezone.utc)+timedelta(minutes=30)).isoformat().replace('+00:00','Z'),'contextRevision':f"ctx-{profile}-{state['context']}",'actor':{'principalType':'user','id':ACTOR,'kind':'admin','status':'active','roleKeys':['qa']},'effectiveRoles':[{'roleKey':'qa','scope':'global'}],'modules':modules,'scope':{'kind':'global','source':'persisted_grants'},'fieldVisibility':[],'commonQueryV1':{'products':disabled,'dealers':disabled},'auditFoundationV1':{'enabled':True,'queryProfile':'dashboard.audit-events.v1','eventVersion':'audit-event.v1','sensitive':disabled},'asyncJobFoundationV1':{'enabled':True,'contractVersion':'async-job.v1','queryProfile':'dashboard.async-jobs.v1','registryVersion':'async-job-registry.v1','sensitive':disabled,'mutations':{'create':False,'cancel':False,'retry':False},'artifacts':{'metadata':False,'download':False}},'workQueueFoundationV1':{'enabled':True,'contractVersion':'work-queue-item.v1','queryProfile':'dashboard.work-queue.v1','registryVersion':'work-queue-registry.v1','sensitive':disabled,'actions':{'assign':False,'acknowledge':False,'resolve':False,'dismiss':False,'reopen':False},'notifications':{'enabled':True,'contractVersion':'in-app-notification.v1','queryProfile':'dashboard.in-app-notifications.v1','markRead':False,'externalDelivery':False}},'mediaFoundationV1':{'enabled':True,'contractVersion':'media-asset.v1','queryProfile':'dashboard.media-assets.v1','registryVersion':'media-registry.v1','safeProfile':'dashboard.media-assets.safe.v1','sensitiveProfile':{'enabled':False,'profileId':'dashboard.media-assets.sensitive.v1'},'actions':{k:False for k in ['create','update','archive','restore','downloadOriginal','manageVariants']},'upload':{'enabled':False,'image':False,'pdf':False,'maxBytes':{'image':10485760,'pdf':26214400},'intentLifetimeSeconds':600,'directControlledApi':True},'preview':{'controlled':True,'pdfInline':False},'legacyAdapters':{'enabled':True,'partial':True},'externalDelivery':False,'ai':False,'bulkImportExport':False},'dataJobFoundationV1':{'enabled':bool(content),'contractVersion':'dashboard.data-jobs.v1','registryVersion':'dashboard.data-jobs.registry.v1','objectKey':'foundation.sample','imports':{'read':bool(content),'create':bool(content),'commit':bool(content)},'exports':{'read':bool(content),'create':bool(content),'download':bool(content)},'upload':{'controlled':True,'directAuthenticatedApi':True},'download':{'controlled':True,'directAuthenticatedApi':True},'tenantPartition':False}}}
def config():
    if state['p09Mode']=='empty': return {'data':[]}
    return {'data':[{'configKey':'foundation.runtime.refresh_interval_seconds','schemaVersion':'runtime-config-schema.v1','activeVersion':3,'safeValue':30,'updatedAt':now()},{'configKey':'foundation.runtime.display_mode','schemaVersion':'runtime-config-schema.v1','activeVersion':4,'safeValue':'compact','updatedAt':now()},{'configKey':'foundation.runtime.safe_origin','schemaVersion':'runtime-config-schema.v1','activeVersion':2,'safeValue':'compiled_default','updatedAt':now()}]}
def flags(): return {'data':[{'flagKey':'foundation.runtime.sample_flag','schemaVersion':'runtime-flag-schema.v1','activeState':'disabled','version':2,'updatedAt':now()}]}
def cells(kind):
    values={'complement':7,'denominator':12,'engage':5,'numerator':5,'rate':0.4167,'view':10}
    return [{'cellKey':k,'state':kind,'valueKind':'rate' if k=='rate' else 'count','publishedValue':values[k] if kind=='published' else None} for k in ['complement','denominator','engage','numerator','rate','view']]
def releases(day):
    def family(version,epoch,status): return {'releaseId':f'release-{version}-{epoch}','releaseDay':day,'metricDefinitionVersion':version,'identityEpoch':epoch,'suppressionPolicyVersion':'k3-v1','fieldVisibilityProfile':'analytics-release-safe.v1','status':status,'completeness':'sealed','cells':cells(status)}
    return {'data':[] if state['p10Mode']=='zero' else [family('metric.v1','epoch-2026-08','suppressed'),family('metric.v2','epoch-2026-09','published')]}
def import_row(status): return {'id':IMP,'object_key':'foundation.sample','status':status,'original_filename':'sample.csv','content_type':'text/csv','byte_size':78,'summary':{'row_count':2 if status=='preview_ready' else 0,'valid_row_count':1 if status=='preview_ready' else 0,'invalid_row_count':1 if status=='preview_ready' else 0,'committed_row_count':0,'failed_commit_row_count':0},'created_at':now(),'expires_at':(datetime.now(timezone.utc)+timedelta(days=7)).isoformat().replace('+00:00','Z'),**({'previewed_at':now(),'preview_expires_at':(datetime.now(timezone.utc)+timedelta(days=7)).isoformat().replace('+00:00','Z')} if status=='preview_ready' else {}),'version':2 if status in ('uploaded','preview_ready') else 1,'request_id':'req-import','capabilities':{'read':True,'create':True,'commit':status=='preview_ready','cancel':status=='uploaded','download':False}}
def meta(): return {'requestId':'r-'+uuid.uuid4().hex,'queryContractVersion':'common-query.v1','pagination':{'mode':'cursor','limit':50,'hasMore':False},'sort':[{'field':'created_at','direction':'desc','nulls':'last'},{'field':'recordId','direction':'asc','nulls':'last'}],'snapshot':{'consistency':'statement','capturedAt':now()},'visibility':{'profileId':'dashboard.data-jobs.v1'}}
class H(BaseHTTPRequestHandler):
    def log_message(self,*args): pass
    def cors(self):
        self.send_header('Access-Control-Allow-Origin',WEB_ORIGIN); self.send_header('Access-Control-Allow-Credentials','true'); self.send_header('Access-Control-Allow-Headers','Content-Type,Content-Length,If-Match,Idempotency-Key,X-Data-Job-Upload-Token,Accept'); self.send_header('Access-Control-Allow-Methods','GET,POST,PUT,OPTIONS')
    def sendj(self,value,status=200):
        body=json.dumps(value).encode(); self.send_response(status); self.cors(); self.send_header('Content-Type','application/json'); self.send_header('Content-Length',str(len(body))); self.end_headers(); self.wfile.write(body)
    def body(self): return self.rfile.read(int(self.headers.get('Content-Length','0') or 0))
    def record(self,body=None): state['requests'].append({'method':self.command,'path':self.path,'body':body,'headers':{k:self.headers.get(k) for k in ['Content-Type','Content-Length','If-Match','Idempotency-Key','X-Data-Job-Upload-Token']}})
    def do_OPTIONS(self): self.send_response(204); self.cors(); self.end_headers()
    def do_GET(self):
        self.record(); path=urllib.parse.urlparse(self.path).path
        if path=='/control/state': return self.sendj({'actor':ACTOR,'importId':IMP,'state':state})
        if path=='/control/requests': return self.sendj({'requests':state['requests']})
        if path=='/api/v1/auth/me': return self.sendj({'data':{'user':{'id':ACTOR,'email':'qa@vanstro.test','role':'admin'},'accessToken':'fixture-session'}}) if state['authenticated'] else self.sendj({'code':'AUTH_REQUIRED'},401)
        if path=='/api/v1/dashboard/foundation': return self.sendj(foundation()) if state['authenticated'] else self.sendj({'code':'AUTH_REQUIRED'},401)
        if path=='/api/v1/dashboard/authorization': return self.sendj(authorization()) if state['authenticated'] else self.sendj({'code':'AUTH_REQUIRED'},401)
        if path=='/api/v1/cart': return self.sendj({'data':{'id':'fixture-cart','currency':'CAD','items':[],'subtotal':{'amountCents':0,'currency':'CAD'}},'meta':{}}) if state['authenticated'] else self.sendj({'code':'AUTH_REQUIRED'},401)
        if path=='/api/v1/account/favorites': return self.sendj({'data':[]}) if state['authenticated'] else self.sendj({'code':'AUTH_REQUIRED'},401)
        if path=='/api/v1/account/me': return self.sendj({'data':{'id':ACTOR,'email':'qa@vanstro.test'}}) if state['authenticated'] else self.sendj({'code':'AUTH_REQUIRED'},401)
        if path=='/api/v1/account/addresses': return self.sendj({'data':[]}) if state['authenticated'] else self.sendj({'code':'AUTH_REQUIRED'},401)
        if path=='/api/v1/account/orders': return self.sendj({'data':[],'meta':{'page':1,'pageSize':20,'total':0,'totalPages':0}}) if state['authenticated'] else self.sendj({'code':'AUTH_REQUIRED'},401)
        if path=='/api/v1/dashboard/overview': return self.sendj({'data':{}})
        if path=='/api/v1/dashboard/jobs': return self.sendj({'data':[job()],'meta':cursor_meta('dashboard.async-jobs.safe.v1',[{'field':'createdAt','direction':'desc','nulls':'last'},{'field':'recordId','direction':'desc','nulls':'last'}])})
        if path==f'/api/v1/dashboard/jobs/{JOB_ID}': return self.sendj({'data':job()})
        if path=='/api/v1/dashboard/jobs/adapters': return self.sendj({'data':[],'meta':{'completion':'complete'}})
        if path=='/api/v1/dashboard/work-queue': return self.sendj({'data':[work_item()],'meta':cursor_meta('dashboard.work-queue.safe.v1',[{'field':'createdAt','direction':'desc','nulls':'last'},{'field':'recordId','direction':'desc','nulls':'last'}]),'summary':{'data':{'contractVersion':'work-queue-summary.v1','open':1,'critical':0,'assignedToMe':0,'unassigned':1,'overdue':0,'byType':{'foundation.attention':1},'bySource':{'async_job':1},'criticalOutsideFilter':0},'relation':'exact','capturedAt':now(),'profileId':'dashboard.work-queue.safe.v1'}})
        if path=='/api/v1/dashboard/work-queue/adapters': return self.sendj({'contractVersion':'work-queue-adapters.v1','completion':'complete','data':[]})
        if path=='/api/v1/dashboard/notifications': return self.sendj({'data':[notice()],'meta':cursor_meta('dashboard.in-app-notifications.v1',[{'field':'createdAt','direction':'desc','nulls':'last'},{'field':'recordId','direction':'desc','nulls':'last'}]),'unread':{'data':1,'relation':'exact','capturedAt':now()}})
        if path=='/api/v1/dashboard/media': return self.sendj(media_result())
        if path=='/api/v1/dashboard/media/adapters': return self.sendj({'contractVersion':'media-legacy-adapters.v1','completion':'complete','data':[]})
        if path==f'/api/v1/dashboard/media/{MEDIA_ID}': return self.sendj({'data':media()})
        if path==f'/api/v1/dashboard/media/{MEDIA_ID}/usages': return self.sendj({'data':[]})
        if path=='/api/v1/dashboard/audit-logs': return self.sendj({'data':[audit()],'meta':cursor_meta('dashboard.audit-events.redacted-list.v1',[{'field':'occurredAt','direction':'desc','nulls':'last'},{'field':'recordId','direction':'desc','nulls':'last'}])})
        if path==f'/api/v1/dashboard/audit-logs/{AUDIT_ID}': return self.sendj({'data':audit()})
        if path=='/api/v1/dashboard/data-jobs/imports': return self.sendj({'data':[] if not state['importStatus'] else [import_row(state['importStatus'])],'meta':meta()})
        if path==f'/api/v1/dashboard/data-jobs/imports/{IMP}': return self.sendj({'data':import_row('preview_ready')})
        if path==f'/api/v1/dashboard/data-jobs/imports/{IMP}/preview': return self.sendj({'data':{'id':IMP,'status':'preview_ready','summary':import_row('preview_ready')['summary'],'rows':[{'row_number':2,'normalized':{'external_key':'qa','label':'QA','state':'active','quantity':1,'effective_date':None,'note':'safe'},'validation_status':'valid','validation_errors':[],'commit_status':'pending','commit_errors':[]},{'row_number':3,'normalized':{'external_key':'bad'},'validation_status':'invalid','validation_errors':[{'code':'FIELD_REQUIRED','field':'label'}],'commit_status':'skipped','commit_errors':[]}],'version':2,'capabilities':import_row('preview_ready')['capabilities']},'page':{'limit':50,'next_cursor':None}})
        if path=='/api/v1/dashboard/runtime/config':
            if state['p09Delay']: release_event.wait(15)
            return self.sendj(config())
        if path=='/api/v1/dashboard/runtime/flags': return self.sendj(flags())
        if path=='/api/v1/dashboard/runtime/readiness/detail': return self.sendj({'data':{'readinessState':'ready','reasonCode':'ready','activeCount':'1','staleCount':'0','totalCapacity':'1','observedAt':now(),'secondaryReasons':[]}})
        if path=='/api/v1/dashboard/runtime/readiness': return self.sendj({'data':{'readinessState':'ready','reasonCode':'ready','observedAt':now()}})
        if path.startswith('/api/v1/dashboard/analytics/releases/'): return self.sendj(releases(path.rsplit('/',1)[-1]))
        if path=='/api/v1/dashboard/operations/alerts': return self.sendj({'data':[]})
        if path=='/api/v1/dashboard/analytics/summary': return self.sendj({'data':{'pageViews7d':0,'uniquePaths7d':0,'topPaths':[]}})
        return self.sendj({'code':'DASHBOARD_NOT_FOUND'},404)
    def do_POST(self):
        raw=self.body(); data=json.loads(raw or b'{}'); self.record(data); path=urllib.parse.urlparse(self.path).path
        if path=='/api/v1/auth/login': state['authenticated']=True; return self.sendj({'data':{'user':{'id':ACTOR,'email':'qa@vanstro.test','role':'admin'},'accessToken':'fixture-session'}})
        if path=='/api/v1/auth/logout': state['authenticated']=False; return self.sendj({'data':{'ok':True}})
        if path=='/control':
            for key in ('profile','context','p09Delay','p09Mode','p10Mode'):
                if key in data: state[key]=data[key]
            if data.get('releaseP09'): release_event.set()
            if data.get('resetRelease'): release_event.clear()
            if data.get('resetRequests'): state['requests']=[]
            return self.sendj({'ok':True})
        if path=='/api/v1/dashboard/data-jobs/imports':
            state['importStatus']='awaiting_upload'; return self.sendj({'data':{'id':IMP,'object_key':'foundation.sample','status':'awaiting_upload','upload':{'method':'PUT','endpoint':f'/dashboard/data-jobs/imports/{IMP}/content','token':TOKEN,'expires_at':(datetime.now(timezone.utc)+timedelta(minutes=5)).isoformat().replace('+00:00','Z')},'version':1}},201)
        return self.sendj({'code':'DASHBOARD_NOT_FOUND'},404)
    def do_PUT(self):
        raw=self.body(); self.record({'byteCount':len(raw)}); path=urllib.parse.urlparse(self.path).path
        if path==f'/api/v1/dashboard/data-jobs/imports/{IMP}/content':
            identity=(self.headers.get('Idempotency-Key'),raw.hex())
            if state['finalizeIdentity'] is None: state['finalizeIdentity']=identity; state['jobs']=1; state['artifacts']=1; state['importStatus']='preview_ready'; return self.sendj({'data':import_row('uploaded'),'meta':{'replayed':False}})
            return self.sendj({'code':'IDEMPOTENCY_CONFLICT'},409)
        return self.sendj({'code':'DASHBOARD_NOT_FOUND'},404)
ThreadingHTTPServer(('127.0.0.1',PORT),H).serve_forever()
