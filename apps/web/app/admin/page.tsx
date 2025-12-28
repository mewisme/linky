export default function AdminDashboard() {
  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-4">Admin Dashboard</h1>
      <p className="text-muted-foreground">
        This is the protected admin dashboard restricted to users with the <code>admin</code> Role.
      </p>
    </div>
  );
}

