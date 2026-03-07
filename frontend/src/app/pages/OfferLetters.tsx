import { useState, useEffect } from "react";
import { DashboardHeader } from "../components/DashboardHeader";
import { Building, DollarSign, Calendar, MapPin, FileText, Check, X, Briefcase, Clock, MessageSquare, Handshake, Send } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { apiClient } from "../../utils/apiClient";
import { toast } from "sonner";
import { getAuthToken } from "../../utils/authStorage";

interface Offer {
  id: string;
  position: string;
  salary: string;
  startDate: string;
  benefits: string;
  workLocation: string;
  workType: string;
  probationPeriod: string;
  joiningBonus: string;
  additionalNotes: string;
  status: "pending" | "accepted" | "rejected" | "negotiating";
  sentDate: string;
  responseDate: string | null;
  recruiterName: string;
  recruiterId: string;
  companyName: string;
}

export function OfferLetters() {
  const navigate = useNavigate();
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [negotiatingOfferId, setNegotiatingOfferId] = useState<string | null>(null);
  const [counterOffer, setCounterOffer] = useState({ salary: "", startDate: "", message: "" });

  useEffect(() => {
    fetchOffers();
  }, []);

  const fetchOffers = async () => {
    try {
      const data = await apiClient.get('/offers/candidate');
      if (data.success && data.offers) {
        const mapped = data.offers.map((o: any) => ({
          id: o._id || o.id,
          position: o.position || "Position",
          salary: o.salary || "",
          startDate: o.startDate || "",
          benefits: o.benefits || "",
          workLocation: o.workLocation || "",
          workType: o.workType || "Full-time",
          probationPeriod: o.probationPeriod || "",
          joiningBonus: o.joiningBonus || "",
          additionalNotes: o.additionalNotes || "",
          status: o.status || "pending",
          sentDate: o.sentDate || o.createdAt,
          responseDate: o.responseDate || null,
          recruiterName: o.recruiterId?.fullName || "Recruiter",
          recruiterId: o.recruiterId?.id || o.recruiterId?._id || "",
          companyName: o.recruiterId?.companyName || o.recruiterId?.fullName || "Company",
        }));
        setOffers(mapped);
      }
    } catch (error) {
      console.error("Failed to fetch offers:", error);
      toast.error("Failed to load offers");
    } finally {
      setLoading(false);
    }
  };

  const handleRespond = async (offerId: string, status: "accepted" | "rejected") => {
    try {
      const data = await apiClient.put(`/offers/${offerId}/respond`, { status });
      if (data.success) {
        toast.success(status === "accepted" ? "🎉 Offer accepted!" : "Offer declined");
        fetchOffers();
      } else {
        toast.error(data.message || "Failed to respond");
      }
    } catch (error) {
      console.error("Respond error:", error);
      toast.error("Failed to respond to offer");
    }
  };

  const handleNegotiate = async (offerId: string) => {
    if (!counterOffer.salary && !counterOffer.startDate && !counterOffer.message) {
      toast.error("Please fill in at least one negotiation field");
      return;
    }
    try {
      const data = await apiClient.put(`/offers/${offerId}/respond`, {
        status: "negotiating",
        counterOffer
      });
      if (data.success) {
        toast.success("Counter-offer sent to recruiter");
        setNegotiatingOfferId(null);
        setCounterOffer({ salary: "", startDate: "", message: "" });
        fetchOffers();
      } else {
        toast.error(data.message || "Failed to send counter-offer");
      }
    } catch (error) {
      console.error("Negotiate error:", error);
      toast.error("Failed to send counter-offer");
    }
  };

  const downloadOfferPdf = async (offerId: string) => {
    try {
      const token = getAuthToken();
      if (!token) throw new Error("No auth token");
      const response = await fetch(`http://localhost:5000/api/offers/${offerId}/pdf`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.ok) throw new Error(`Failed to download (${response.status})`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `offer-letter-${offerId}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success("Offer letter downloaded");
    } catch (error) {
      console.error("Offer PDF download error:", error);
      toast.error("Failed to download offer letter");
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "";
    try {
      return new Date(dateStr).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return { text: "Action Required", color: "bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300 border-yellow-300 dark:border-yellow-700" };
      case "accepted":
        return { text: "Accepted ✓", color: "bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300 border-green-300 dark:border-green-700" };
      case "rejected":
        return { text: "Declined", color: "bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300 border-red-300 dark:border-red-700" };
      case "negotiating":
        return { text: "Negotiating", color: "bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700" };
      default:
        return { text: status, color: "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300" };
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <DashboardHeader />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Offer Letters
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Review and respond to your job offers
          </p>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        ) : offers.length > 0 ? (
          <div className="space-y-6">
            {offers.map((offer) => {
              const badge = getStatusBadge(offer.status);
              return (
                <div
                  key={offer.id}
                  className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden"
                >
                  {/* Header */}
                  <div className={`p-6 border-b border-gray-200 dark:border-gray-800 ${offer.status === 'accepted'
                      ? 'bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/10 dark:to-emerald-900/10'
                      : offer.status === 'pending'
                        ? 'bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/10 dark:to-orange-900/10'
                        : 'bg-gray-50 dark:bg-gray-800'
                    }`}>
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center flex-shrink-0">
                          <Building className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-1">
                            {offer.position}
                          </h3>
                          <p className="text-gray-600 dark:text-gray-400">
                            {offer.companyName}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                            From: {offer.recruiterName}
                          </p>
                        </div>
                      </div>

                      <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${badge.color}`}>
                        {badge.text}
                      </span>
                    </div>
                  </div>

                  {/* Details */}
                  <div className="p-6">
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5 mb-6">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
                          <DollarSign className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-500">Salary</p>
                          <p className="font-semibold text-gray-900 dark:text-white">{offer.salary || "—"}</p>
                        </div>
                      </div>

                      {offer.workLocation && (
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                            <MapPin className="w-5 h-5 text-blue-600" />
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 dark:text-gray-500">Location</p>
                            <p className="font-semibold text-gray-900 dark:text-white">{offer.workLocation}</p>
                          </div>
                        </div>
                      )}

                      {offer.startDate && (
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 bg-purple-100 dark:bg-purple-900/20 rounded-lg flex items-center justify-center">
                            <Calendar className="w-5 h-5 text-purple-600" />
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 dark:text-gray-500">Start Date</p>
                            <p className="font-semibold text-gray-900 dark:text-white">{offer.startDate}</p>
                          </div>
                        </div>
                      )}

                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-orange-100 dark:bg-orange-900/20 rounded-lg flex items-center justify-center">
                          <Briefcase className="w-5 h-5 text-orange-600" />
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-500">Work Type</p>
                          <p className="font-semibold text-gray-900 dark:text-white">{offer.workType}</p>
                        </div>
                      </div>

                      {offer.probationPeriod && (
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                            <Clock className="w-5 h-5 text-gray-600" />
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 dark:text-gray-500">Probation</p>
                            <p className="font-semibold text-gray-900 dark:text-white">{offer.probationPeriod}</p>
                          </div>
                        </div>
                      )}

                      {offer.joiningBonus && (
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg flex items-center justify-center">
                            <DollarSign className="w-5 h-5 text-yellow-600" />
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 dark:text-gray-500">Joining Bonus</p>
                            <p className="font-semibold text-gray-900 dark:text-white">{offer.joiningBonus}</p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Benefits */}
                    {offer.benefits && (
                      <div className="mb-5 p-4 bg-green-50 dark:bg-green-900/10 rounded-lg border border-green-100 dark:border-green-900/30">
                        <h4 className="font-semibold text-green-800 dark:text-green-300 mb-2 flex items-center gap-2">
                          <Check className="w-4 h-4" />
                          Benefits & Perks
                        </h4>
                        <p className="text-sm text-green-700 dark:text-green-400">{offer.benefits}</p>
                      </div>
                    )}

                    {/* Additional Notes */}
                    {offer.additionalNotes && (
                      <div className="mb-5 p-4 bg-blue-50 dark:bg-blue-900/10 rounded-lg border border-blue-100 dark:border-blue-900/30">
                        <h4 className="font-semibold text-blue-800 dark:text-blue-300 mb-2">
                          Additional Notes
                        </h4>
                        <p className="text-sm text-blue-700 dark:text-blue-400">{offer.additionalNotes}</p>
                      </div>
                    )}

                    {/* Received date */}
                    <p className="text-xs text-gray-500 dark:text-gray-500 mb-4">
                      Received on {formatDate(offer.sentDate)}
                      {offer.responseDate && ` · Responded on ${formatDate(offer.responseDate)}`}
                    </p>

                    {/* Actions */}
                    {(offer.status === "pending" || offer.status === "negotiating") && (
                      <div className="space-y-4">
                        <div className="flex gap-3">
                          <button
                            onClick={() => handleRespond(offer.id, "accepted")}
                            className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition-colors"
                          >
                            <Check className="w-5 h-5" />
                            Accept Offer
                          </button>
                          <button
                            onClick={() => {
                              setNegotiatingOfferId(negotiatingOfferId === offer.id ? null : offer.id);
                              setCounterOffer({ salary: offer.salary || "", startDate: offer.startDate || "", message: "" });
                            }}
                            className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-amber-500 text-white rounded-lg hover:bg-amber-600 font-medium transition-colors"
                          >
                            <Handshake className="w-5 h-5" />
                            Negotiate
                          </button>
                          <button
                            onClick={() => handleRespond(offer.id, "rejected")}
                            className="flex-1 flex items-center justify-center gap-2 px-6 py-3 border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 font-medium transition-colors"
                          >
                            <X className="w-5 h-5" />
                            Decline
                          </button>
                          <button
                            onClick={() => navigate(`/candidate/messages?to=${offer.recruiterId}`)}
                            className="flex items-center justify-center gap-2 px-4 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                          >
                            <MessageSquare className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => downloadOfferPdf(offer.id)}
                            className="flex items-center justify-center gap-2 px-4 py-3 border border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                          >
                            <FileText className="w-5 h-5" />
                          </button>
                        </div>

                        {/* Negotiation Form */}
                        {negotiatingOfferId === offer.id && (
                          <div className="p-5 bg-amber-50 dark:bg-amber-900/10 rounded-lg border border-amber-200 dark:border-amber-800">
                            <h4 className="font-semibold text-amber-800 dark:text-amber-300 mb-4 flex items-center gap-2">
                              <Handshake className="w-5 h-5" />
                              Submit Counter-Offer
                            </h4>
                            <div className="grid md:grid-cols-2 gap-4 mb-4">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Proposed Salary</label>
                                <input
                                  type="text"
                                  value={counterOffer.salary}
                                  onChange={(e) => setCounterOffer({ ...counterOffer, salary: e.target.value })}
                                  placeholder="e.g. $95,000/year"
                                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Proposed Start Date</label>
                                <input
                                  type="text"
                                  value={counterOffer.startDate}
                                  onChange={(e) => setCounterOffer({ ...counterOffer, startDate: e.target.value })}
                                  placeholder="e.g. April 15, 2026"
                                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                                />
                              </div>
                            </div>
                            <div className="mb-4">
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Message to Recruiter</label>
                              <textarea
                                value={counterOffer.message}
                                onChange={(e) => setCounterOffer({ ...counterOffer, message: e.target.value })}
                                placeholder="Explain your reasoning or additional requests..."
                                rows={3}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none"
                              />
                            </div>
                            <div className="flex gap-3">
                              <button
                                onClick={() => handleNegotiate(offer.id)}
                                className="flex items-center gap-2 px-5 py-2.5 bg-amber-600 text-white rounded-lg hover:bg-amber-700 font-medium transition-colors"
                              >
                                <Send className="w-4 h-4" />
                                Send Counter-Offer
                              </button>
                              <button
                                onClick={() => { setNegotiatingOfferId(null); setCounterOffer({ salary: "", startDate: "", message: "" }); }}
                                className="px-5 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {offer.status !== "pending" && offer.status !== "negotiating" && (
                      <div className="mt-4">
                        <button
                          onClick={() => downloadOfferPdf(offer.id)}
                          className="inline-flex items-center gap-2 px-4 py-2 border border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                        >
                          <FileText className="w-4 h-4" />
                          Download Offer Letter (PDF)
                        </button>
                      </div>
                    )}

                    {offer.status === "accepted" && (
                      <div className="bg-green-50 dark:bg-green-900/10 p-4 rounded-lg border border-green-200 dark:border-green-800">
                        <p className="text-green-700 dark:text-green-300 font-medium">
                          🎉 Congratulations! You've accepted this offer. The recruiter will reach out with next steps.
                        </p>
                      </div>
                    )}

                    {offer.status === "rejected" && (
                      <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                        <p className="text-gray-600 dark:text-gray-400">
                          You've declined this offer. You can continue exploring other opportunities.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-xl shadow-sm">
            <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              No Offer Letters Yet
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Keep applying and interviewing — your offers will appear here
            </p>
            <button
              onClick={() => navigate("/candidate/dashboard")}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:opacity-90 transition-opacity"
            >
              Browse Jobs
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
