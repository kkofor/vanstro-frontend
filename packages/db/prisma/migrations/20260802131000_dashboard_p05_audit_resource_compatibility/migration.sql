ALTER TABLE "audit_events"
  DROP CONSTRAINT "audit_events_resource_type_check";

ALTER TABLE "audit_events"
  ADD CONSTRAINT "audit_events_resource_type_check" CHECK (
    "resourceType" IN (
      'user','role','permission','dealer','dealer_location','membership','product','category',
      'inventory','price','promotion','order','shipment','checkout_session','payment_session',
      'refund','customer','content','review','lead','support','email','erp_job','runtime_config',
      'feature_flag','audit_event','async_job','job_artifact'
    )
  );
