import RequestTable from "./RequestTable";

export default function AuditView({ requests }) {
  return (
    <>
      <h2 className="text-xl font-semibold mb-4">
        Audit – All Requests
      </h2>

      <RequestTable requests={requests} />
    </>
  );
}
