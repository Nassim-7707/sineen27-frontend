import React, { useState } from "react";
import { User, Trash2, TrendingUp, Calendar, Key } from "lucide-react";
import { Input, Badge } from "./dashboard-ui";
import { toast } from "sonner";
import { Order } from "@/adminFunctions/orders";
import {
  validateUsername,
  validatePasswordStrength,
  formatUsernameInput,
  PASSWORD_REQUIREMENTS_HINT,
} from "@/adminFunctions/validation";

interface UsersTabProps {
   users: any[];
   addUser: (u: string, p: string, r: string) => void;
   deleteUser: (id: string) => void;
   orders: Order[];
   setUserPassword: (id: string, p: string) => void;
}

export default function UsersTab({ users, addUser, deleteUser, orders, setUserPassword }: UsersTabProps) {
   const [startDate, setStartDate] = useState("");
   const [endDate, setEndDate] = useState("");
   const [newUser, setNewUser] = useState({ username: "", password: "" });
   const [userErrors, setUserErrors] = useState<{ username?: string; password?: string }>({});

   const parseOrderDate = (dateStr: string) => {
      let d: Date;
      if (dateStr.includes("-")) {
         d = new Date(dateStr);
      } else {
         const [day, m, y] = dateStr.split("/").map(Number);
         d = new Date(y, m - 1, day);
      }
      d.setHours(0, 0, 0, 0);
      return d;
   };

   const normalizedStart = startDate ? new Date(startDate) : null;
   if (normalizedStart) normalizedStart.setHours(0, 0, 0, 0);
   const normalizedEnd = endDate ? new Date(endDate) : null;
   if (normalizedEnd) normalizedEnd.setHours(23, 59, 59, 999);

   const getPerformance = (username: string) => {
      const userOrders = orders.filter(o => {
         const oDate = parseOrderDate(o.date);
         const isCashier = o.cashierName === username;
         const matchesStart = !normalizedStart || oDate >= normalizedStart;
         const matchesEnd = !normalizedEnd || oDate <= normalizedEnd;
         return isCashier && matchesStart && matchesEnd;
      });

      const total = userOrders.reduce((sum, o) => sum + o.totalDZD, 0);
      const count = userOrders.length;
      return { total, count, average: count ? total / count : 0 };
   };

   const performanceData = users
      .filter(u => u.role !== 'admin')
      .map(u => ({ ...u, ...getPerformance(u.username) }))
      .sort((a, b) => b.total - a.total);

   const topPerformer = performanceData[0]?.total > 0 ? performanceData[0] : null;

   const handleAddUser = () => {
      const errors: { username?: string; password?: string } = {};
      const usernameCheck = validateUsername(newUser.username);
      if (!usernameCheck.valid) errors.username = usernameCheck.message;
      const passwordCheck = validatePasswordStrength(newUser.password);
      if (!passwordCheck.valid) errors.password = passwordCheck.message;
      if (Object.keys(errors).length > 0) {
         setUserErrors(errors);
         toast.error(Object.values(errors)[0]);
         return;
      }
      setUserErrors({});
      addUser(newUser.username.trim(), newUser.password, 'employee');
      toast.success("تم إضافة المستخدم بنجاح");
      setNewUser({ username: "", password: "" });
   };

   return (
      <div className="dashboard-page">
         <header className="dashboard-page-header">
            <div>
               <h1 className="dash-page-title">المستخدمون</h1>
               <p className="dash-caption mt-1">الحسابات والصلاحيات</p>
            </div>
         </header>
         <div className="dashboard-grid lg:grid-cols-3">
            <div className="lg:col-span-1 dashboard-card p-6 sm:p-8 space-y-5 flex flex-col h-fit">
               <h2 className="dash-section-title border-b border-border/60 pb-4">مستخدم جديد</h2>
               <div>
                  <Input
                     placeholder="اسم المستخدم (إنجليزي)"
                     className={`dashboard-input w-full text-right font-sans ${userErrors.username ? "border-destructive" : ""}`}
                     value={newUser.username}
                     onChange={e => {
                        setNewUser({ ...newUser, username: formatUsernameInput(e.target.value) });
                        if (userErrors.username) setUserErrors(er => ({ ...er, username: undefined }));
                     }}
                     maxLength={30}
                     autoComplete="username"
                  />
                  {userErrors.username && <p className="text-xs text-red-500 mt-1 font-bold">{userErrors.username}</p>}
               </div>
               <div>
                  <Input
                     type="password"
                     placeholder="كلمة المرور"
                     className={`dashboard-input w-full text-right ${userErrors.password ? "border-destructive" : ""}`}
                     value={newUser.password}
                     onChange={e => {
                        setNewUser({ ...newUser, password: e.target.value.slice(0, 64) });
                        if (userErrors.password) setUserErrors(er => ({ ...er, password: undefined }));
                     }}
                     maxLength={64}
                     autoComplete="new-password"
                  />
                  {userErrors.password && <p className="text-xs text-red-500 mt-1 font-bold">{userErrors.password}</p>}
                  <p className="text-xs text-muted-foreground mt-1">{PASSWORD_REQUIREMENTS_HINT}</p>
               </div>
               <div className="w-full h-12 text-right bg-muted border border-border rounded-lg px-4 flex items-center justify-between font-bold text-sm text-muted-foreground">
                  <span>موظف عادي (Employee)</span>
                  <span>الصلاحية:</span>
               </div>
               <button
                  type="button"
                  onClick={handleAddUser}
                  className="dashboard-btn-primary w-full h-12 rounded-lg min-h-[48px]"
               >
                  <User className="h-4 w-4" /> تأكيد وإضافة
               </button>
            </div>
            <div className="lg:col-span-2 dashboard-table-wrap overflow-x-auto">
               <table className="dashboard-table min-w-[320px]">
                  <thead>
                     <tr>
                        <th className="py-4 px-4 sm:px-6 font-bold">المستخدم</th>
                        <th className="py-4 px-4 sm:px-6 font-bold">الدور</th>
                        <th className="py-4 px-4 sm:px-6 text-left">إجراءات</th>
                     </tr>
                  </thead>
                  <tbody className="italic">
                     {users.map(user => (
                        <tr key={user.id}>
                           <td className="py-4 px-4 sm:px-6 font-bold text-foreground">{user.username}</td>
                           <td className="py-4 px-4 sm:px-6">
                              <span className={`px-3 py-1 rounded-full text-[10px] font-black ${user.role === 'admin' ? 'bg-primary/10 text-primary' : 'bg-accent/15 text-accent'}`}>
                                 {user.role === 'admin' ? 'مدير نظام' : 'موظف'}
                              </span>
                           </td>
                           <td className="py-4 px-4 sm:px-6 text-left">
                              <div className="flex items-center justify-end gap-3">
                                 {user.role !== 'admin' && (
                                    <>
                                       <button
                                          type="button"
                                          onClick={() => {
                                             const newP = prompt(`أدخل كلمة المرور الجديدة للمستخدم ${user.username}\n(${PASSWORD_REQUIREMENTS_HINT})`);
                                             if (newP) {
                                                const check = validatePasswordStrength(newP);
                                                if (!check.valid) {
                                                   toast.error(check.message);
                                                   return;
                                                }
                                                setUserPassword(user.id, newP);
                                                toast.success("تم تغيير كلمة المرور بنجاح");
                                             }
                                          }}
                                          className="text-muted-foreground hover:text-primary transition-all p-1 touch-target"
                                          title="تغيير كلمة المرور"
                                       >
                                          <Key className="h-4 w-4" />
                                       </button>
                                       <button type="button" onClick={() => { if (confirm('حذف المستخدم؟')) deleteUser(user.id); }} className="text-muted-foreground hover:text-destructive transition-all p-1 touch-target">
                                          <Trash2 className="h-4 w-4" />
                                       </button>
                                    </>
                                 )}
                              </div>
                           </td>
                        </tr>
                     ))}
                  </tbody>
               </table>
            </div>
         </div>

         {/* Employee Performance Section */}
         <div className="dashboard-card space-y-8 mt-8" dir="rtl">
            <div className="flex flex-col md:flex-row justify-between items-center gap-6">
               <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-accent/15 rounded-xl flex items-center justify-center text-accent">
                     <TrendingUp className="h-5 w-5" />
                  </div>
                  <h2 className="dash-section-title">أداء الموظفين</h2>
               </div>

               <div className="flex flex-wrap items-center gap-4">
                  <div className="flex items-center gap-2 bg-muted p-2 rounded-xl border border-border">
                     <Calendar className="h-4 w-4 text-muted-foreground" />
                     <input
                        type="date"
                        value={startDate}
                        onChange={e => {
                           const val = e.target.value;
                           setStartDate(val);
                           if (endDate && val > endDate) setEndDate(val);
                        }}
                        className="bg-transparent text-xs font-bold outline-none px-2"
                     />
                  </div>
                  <span className="text-warm-gray font-bold">إلى</span>
                  <div className="flex items-center gap-2 bg-muted p-2 rounded-xl border border-border">
                     <Calendar className="h-4 w-4 text-muted-foreground" />
                     <input
                        type="date"
                        value={endDate}
                        onChange={e => {
                           const val = e.target.value;
                           setEndDate(val);
                           if (startDate && val < startDate) setStartDate(val);
                        }}
                        className="bg-transparent text-xs font-bold outline-none px-2"
                     />
                  </div>
                  {(startDate || endDate) && (
                     <button type="button" onClick={() => { setStartDate(""); setEndDate(""); }} className="text-[10px] font-bold text-destructive hover:underline">إعادة تعيين</button>
                  )}
               </div>
            </div>

            {topPerformer && (
               <div className="gold-gradient p-6 sm:p-8 rounded-2xl text-accent-foreground flex flex-col md:flex-row justify-between items-center gap-6 shadow-xl">
                  <div className="flex items-center gap-5">
                     <div className="h-16 w-16 bg-primary-foreground/20 rounded-2xl flex items-center justify-center backdrop-blur-md">
                        <TrendingUp className="h-8 w-8" />
                     </div>
                     <div>
                        <p className="text-primary-foreground/80 font-bold text-xs mb-1 uppercase tracking-widest">أفضل موظف مبيعاً</p>
                        <h3 className="text-2xl font-black">{topPerformer.username}</h3>
                     </div>
                  </div>
                  <div className="flex gap-6 sm:gap-10">
                     <div className="text-center">
                        <p className="text-primary-foreground/80 text-[10px] font-bold mb-1">إجمالي المبيعات</p>
                        <p className="text-xl sm:text-2xl font-black">{topPerformer.total.toLocaleString()} دج</p>
                     </div>
                     <div className="text-center border-r border-primary-foreground/20 pr-6 sm:pr-10">
                        <p className="text-primary-foreground/80 text-[10px] font-bold mb-1">عدد الطلبيات</p>
                        <p className="text-xl sm:text-2xl font-black">{topPerformer.count}</p>
                     </div>
                  </div>
               </div>
            )}

            <div className="overflow-x-auto">
               <table className="dashboard-table min-w-[480px]">
                  <thead className="text-[11px] font-black uppercase tracking-wider">
                     <tr>
                        <th className="py-4 px-4 sm:px-6">الموظف</th>
                        <th className="py-4 px-4 sm:px-6 text-center">عدد المبيعات</th>
                        <th className="py-4 px-4 sm:px-6 text-center">إجمالي المبيعات</th>
                        <th className="py-4 px-4 sm:px-6 text-center">متوسط الطلب</th>
                        <th className="py-4 px-4 sm:px-6 text-center">الحالة</th>
                     </tr>
                  </thead>
                  <tbody>
                     {performanceData.map(user => (
                        <tr key={user.id} className="font-bold group">
                           <td className="py-6 px-4 sm:px-6">
                              <div className="flex items-center gap-3">
                                 <div className="h-8 w-8 bg-muted rounded-full flex items-center justify-center text-muted-foreground group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-200">
                                    <User className="h-4 w-4" />
                                 </div>
                                 <span className="text-sm">{user.username}</span>
                              </div>
                           </td>
                           <td className="py-6 px-4 sm:px-6 text-center font-sans">{user.count}</td>
                           <td className="py-6 px-4 sm:px-6 text-center font-sans text-accent">{user.total.toLocaleString()} دج</td>
                           <td className="py-6 px-4 sm:px-6 text-center font-sans text-muted-foreground">{user.average.toLocaleString(undefined, { maximumFractionDigits: 0 })} دج</td>
                           <td className="py-6 px-4 sm:px-6 text-center">
                              <Badge className={user.count > 0 ? "bg-accent/15 text-accent" : "bg-muted text-muted-foreground"}>
                                 {user.count > 10 ? 'نشط جداً' : user.count > 0 ? 'نشط' : 'لا يوجد مبيعات'}
                              </Badge>
                           </td>
                        </tr>
                     ))}
                  </tbody>
               </table>
            </div>
         </div>
      </div>
   );
}
